#!/usr/bin/env -S bun run

/// <reference types="bun-types" />

// Sync src/content/projects/ against the prefecture's official list pages.
// The entry files are the source of truth (ADR 0013): this tool creates
// nothing on its own and never deletes; it
// - fills missing frontmatter fields on entries (and number-only stubs a
//   human created for reported new rows),
// - reports drift between stored values and what the pages say now,
// - reports official numbers that no entry or excluded marker accounts for.
//
// Ownership boundary: the tool rewrites only the frontmatter, and only to
// fill fields that are absent; existing values are never overwritten (apply
// a reported diff by editing the md). The body is human-owned and preserved
// byte-for-byte. lat/lng/municipality are fill-only and never diffed: they
// are geocoded at 大字-centroid precision and hand-pinned afterwards, so a
// re-geocode always disagrees and the diff would be permanent noise.
//
// Sources, per entry:
// - JA list page: name (the official list wording, annotations included),
//   completion year, detail-page URL, JA PDF links.
// - EN list page: EN PDF link.
// - JA detail page (建築データ table): 所在地 (geocoded), 主要用途 (`use`),
//   設計者 (`architects`, one unsplit string).
// - GSI address search: 所在地 → lat/lng + municipality (incl. ward).
//   Banchi-level precision isn't available; matches are 大字/丁目 centroids —
//   review the printed geocode report and pin outliers by editing the entry.

// The yaml package rather than Bun.YAML: the in-source tests run under
// Vitest (Node), where the Bun global doesn't exist.
import { parse as parseYaml } from "yaml";

const BASE = "https://www.pref.kumamoto.jp";
const JA_LIST_URL = `${BASE}/soshiki/115/83273.html`;
const EN_LIST_URL = `${BASE}/soshiki/115/4579.html`;
const OUT_DIR = "src/content/projects";

const FETCH_DELAY_MS = 300;

type ActiveData = {
  number: number;
  name?: string;
  location?: string;
  municipality?: string;
  lat?: number;
  lng?: number;
  architects?: string[];
  completedYear?: number;
  use?: string;
  url?: string;
  pdfJa?: string[];
  pdfEn?: string[];
};
type EntryDoc = {
  id: string;
  data: ActiveData;
  excluded: boolean;
  body: string;
};

type JaRow = {
  number: number;
  name: string;
  completedYear: number | undefined;
  detailUrl: string;
  jaPdfs: { label: string; url: string }[];
};

type BuildingRecord = Record<string, string>;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let lastFetch = 0;
async function throttled<T>(go: () => Promise<T>): Promise<T> {
  const wait = lastFetch + FETCH_DELAY_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastFetch = Date.now();
  return await go();
}

async function fetchText(url: string): Promise<string> {
  return await throttled(async () => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
    return await res.text();
  });
}

function decodeEntities(s: string): string {
  return s
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&nbsp;", " ");
}

function stripTags(s: string): string {
  return decodeEntities(s.replace(/<br\s*\/?>/g, " ").replace(/<[^>]+>/g, ""))
    .replaceAll("　", " ")
    .replace(/\s+/g, " ")
    .trim();
}

// --- JA list ---------------------------------------------------------------

function parseJaList(html: string): Map<number, JaRow> {
  const rows = new Map<number, JaRow>();
  for (const p of html.matchAll(/<p>([\s\S]*?)<\/p>/g)) {
    const block = p[1] ?? "";
    const detail = block.match(/<a href="(\/[^"]+\.html)"[^>]*>([\s\S]*?)<\/a>/);
    if (!detail) continue;
    const text = stripTags(detail[2] ?? "");
    const head = text.match(/^(\d+)\s+(.*)$/);
    if (!head) continue;
    const number = Number(head[1]);
    const rest = head[2] ?? "";
    // The name runs up to the completion date (YYYY.M) or, for undated rows,
    // up to a lone dash separator.
    const date = rest.match(/\s(\d{4})\.\d{1,2}/);
    const dash = rest.match(/\s[-‐−]\s/);
    const cut = date && (!dash || date.index! < dash.index!) ? date : dash;
    if (!cut) continue;
    const name = rest.slice(0, cut.index).trim();
    const completedYear = date && cut === date ? Number(date[1]) : undefined;
    const jaPdfs = [
      ...block.matchAll(/<a href="(\/uploaded\/[^"]+\.pdf)"[^>]*>([\s\S]*?)<\/a>/g),
    ].map((m) => ({
      label: stripTags(m[2] ?? "").replace(/[\s　]*（PDFファイル[^）]*）\s*$/, ""),
      url: BASE + (m[1] ?? ""),
    }));
    rows.set(number, { number, name, completedYear, detailUrl: BASE + detail[1], jaPdfs });
  }
  return rows;
}

// --- EN list ---------------------------------------------------------------

function parseEnPdfs(html: string): Map<number, string> {
  const pdfs = new Map<number, string>();
  for (const tr of html.matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
    const cells = [...(tr[1] ?? "").matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => m[1]);
    if (cells.length < 2) continue;
    const number = Number(stripTags(cells[0] ?? ""));
    if (!Number.isInteger(number) || number <= 0) continue;
    const pdf = (cells[1] ?? "").match(/<a href="(\/uploaded\/[^"]+\.pdf)"/);
    if (pdf) pdfs.set(number, BASE + pdf[1]);
  }
  return pdfs;
}

// --- detail page (建築データ) ------------------------------------------------

// A detail page holds one 建築データ block per building; a new 名称 starts a
// new record. The markup varies by page age: th/td table rows, td/td table
// rows, or plain "所在地　value" text lines — one combined scan covers all
// three, in document order.
const FIELD_ALIASES: Record<string, string> = {
  施設名: "名称",
  建物用途: "主要用途",
  用途: "主要用途",
  設計: "設計者",
};
const FIELDS = new Set(["名称", "ふりがな", "所在地", "主要用途", "事業主体", "設計者"]);

function parseBuildingRecords(html: string): BuildingRecord[] {
  const records: BuildingRecord[] = [];
  let current: BuildingRecord | null = null;
  // Text-line fields appear as 「所在地　値」「所在地／値」「名 称｜値」…;
  // 設計 must not fire inside 構造設計/電気設計 or shadow 設計者.
  const pattern =
    /<t[hd][^>]*>([\s\S]*?)<\/t[hd]>\s*<td[^>]*>([\s\S]*?)<\/td>|(名\s?称|施設名|所在地|主要用途|建物用途|事業主体|設計者|(?<![構造電気設備機械])設\s?計(?!者))[　：:／｜ ]+([^<\r\n]+)/g;
  for (const m of html.matchAll(pattern)) {
    const rawField = (m[1] !== undefined ? stripTags(m[1]) : (m[3] ?? "")).replace(/\s/g, "");
    const field = FIELD_ALIASES[rawField] ?? rawField;
    if (!FIELDS.has(field)) continue;
    const value = stripTags(m[2] ?? m[4] ?? "");
    if (field === "名称" || current === null) {
      current = {};
      records.push(current);
    }
    if (value !== "") current[field] ??= value;
  }
  return records.filter((r) => r["所在地"] || r["主要用途"] || r["設計者"]);
}

// --- geocoding ---------------------------------------------------------------

type Geocoded = { lat: number; lng: number; municipality: string; matchedTitle: string };

const KUMAMOTO_WARDS = ["中央区", "東区", "西区", "南区", "北区"];

function normalizeAddress(addr: string): string {
  return addr
    .replace(/[（(＜].*$/, "") // trailing "（○○HP）https://…＜外部リンク＞" notes
    .replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0))
    .replaceAll("&minus;", "-")
    .replace(/[−ー―‐]/g, "-")
    .replace(/\s+/g, "")
    .replace(/[、・].*$/, "") // multi-lot addresses: keep the first lot
    .replace(/番地?の?\d*.*$|地先.*$|地内.*$/, "")
    .replace(/-?\d+(-\d+)*$/, "");
}

function municipalityOf(title: string): string | null {
  const m = title
    .replace(/^熊本県/, "")
    .match(/^(熊本市(?:中央|東|西|南|北)区|(?:.+?郡)?.+?[市町村])/);
  const name = m?.[1];
  if (!name) return null;
  return name.replace(/^.+?郡/, "");
}

async function gsiSearch(q: string): Promise<{ lat: number; lng: number; title: string }[]> {
  const url = `https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(q)}`;
  const json = (await throttled(async () => {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as unknown;
  })) as { geometry: { coordinates: [number, number] }; properties: { title: string } }[] | null;
  return (json ?? []).map((hit) => ({
    lat: hit.geometry.coordinates[1],
    lng: hit.geometry.coordinates[0],
    title: hit.properties.title,
  }));
}

// The GSI search falls back to a municipality centroid when it can't match
// the 大字, so a hit only counts if the returned title goes deeper than the
// municipality. Old (pre-2012) 熊本市 addresses lack the ward the search
// needs — retry with each ward inserted until one resolves.
async function geocode(address: string): Promise<Geocoded | null> {
  const addr = normalizeAddress(address).replace(/^熊本県/, "");
  const candidates: string[] = [];
  const kumamotoCity = addr.match(/^熊本市(?!中央区|東区|西区|南区|北区)(.+)$/);
  if (kumamotoCity) {
    for (const ward of KUMAMOTO_WARDS) candidates.push(`熊本市${ward}${kumamotoCity[1]}`);
  }
  candidates.push(`熊本県${addr}`);
  // 郡 spellings drift (芦北郡 vs the official 葦北郡) — retry without it.
  if (/^.+?郡/.test(addr)) candidates.push(`熊本県${addr.replace(/^.+?郡/, "")}`);
  for (const q of candidates) {
    for (const hit of await gsiSearch(q)) {
      const municipality = municipalityOf(hit.title);
      if (!municipality) continue;
      const beyond = hit.title
        .replace(/^熊本県/, "")
        .replace(/^.+?郡/, "")
        .slice(municipality.length);
      // GSI fuzzy-matches (春日 → 春竹町), so a hit only counts when the
      // matched 大字/町 actually appears in the queried address.
      if (beyond === "" || !q.includes(beyond.slice(0, 2))) continue;
      return {
        lat: Number(hit.lat.toFixed(4)),
        lng: Number(hit.lng.toFixed(4)),
        municipality,
        matchedTitle: hit.title,
      };
    }
  }
  return null;
}

// --- entry files ---------------------------------------------------------------

const ID_PATTERN = /^\d{4}-[a-z0-9][a-z0-9-]*$/;

function parseEntry(id: string, raw: string): EntryDoc {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) throw new Error(`${id}: no frontmatter`);
  const data = (parseYaml(m[1]!) ?? {}) as ActiveData & { excluded?: boolean };
  if (!ID_PATTERN.test(id)) throw new Error(`${id}: id must be NNNN-<slug>`);
  if (!Number.isInteger(data.number) || data.number <= 0)
    throw new Error(`${id}: missing or invalid number`);
  if (Number(id.slice(0, 4)) !== data.number)
    throw new Error(`${id}: filename prefix does not match number ${data.number}`);
  const { excluded, ...rest } = data;
  return { id, data: rest, excluded: excluded === true, body: raw.slice(m[0].length) };
}

function yamlStr(s: string): string {
  return /[:#"'\[\]{}&*!|>%@`]/.test(s) || /^\s|\s$/.test(s) ? JSON.stringify(s) : s;
}

// Canonical frontmatter for an active entry: fixed field order, body preserved.
function renderEntry(doc: EntryDoc): string {
  const d = doc.data;
  const lines = ["---", `number: ${d.number}`, `name: ${yamlStr(d.name ?? "")}`];
  if (d.location) lines.push(`location: ${yamlStr(d.location)}`);
  if (d.municipality) lines.push(`municipality: ${yamlStr(d.municipality)}`);
  if (d.lat !== undefined) lines.push(`lat: ${d.lat}`);
  if (d.lng !== undefined) lines.push(`lng: ${d.lng}`);
  if (d.architects !== undefined)
    lines.push("architects:", ...d.architects.map((a) => `  - ${yamlStr(a)}`));
  if (d.completedYear !== undefined) lines.push(`completedYear: ${d.completedYear}`);
  if (d.use) lines.push(`use: ${yamlStr(d.use)}`);
  if (d.url) lines.push(`url: ${d.url}`);
  for (const [field, urls] of [
    ["pdfJa", d.pdfJa],
    ["pdfEn", d.pdfEn],
  ] as const) {
    if (urls && urls.length > 0) lines.push(`${field}:`, ...urls.map((u) => `  - ${u}`));
  }
  lines.push("---");
  const body = doc.body.replace(/^\n+/, "");
  return `${lines.join("\n")}\n${body === "" ? "" : `\n${body}`}`;
}

// --- sync ----------------------------------------------------------------------

// Split rows put several entries on one official number; each md names its
// own building. Match an entry to its 建築データ record by name containment;
// a lone record needs no match, but guessing among several would silently
// attach another building's data.
function matchRecord(
  records: BuildingRecord[],
  name: string | undefined,
  siblings: number,
): BuildingRecord | null {
  if (name) {
    const byName = records.find(
      (r) => r["名称"] && (name.includes(r["名称"]) || r["名称"]!.includes(name)),
    );
    if (byName) return byName;
  }
  if (records.length === 1 && siblings === 1) return records[0]!;
  return null;
}

// On a split row, keep just the JA PDFs naming this building (falling back
// to all); a single entry gets all.
function matchPdfs(row: JaRow, name: string | undefined, siblings: number): string[] {
  const matching =
    siblings > 1 && name
      ? row.jaPdfs.filter((p) => name.includes(p.label) || p.label.includes(name))
      : [];
  return (matching.length > 0 ? matching : row.jaPdfs).map((p) => p.url);
}

// Architects live in the md as a hand-splittable array but on the page as one
// run-on string; compare with separators stripped so a hand split isn't
// permanent diff noise.
function sameArchitects(stored: string[], fetched: string): boolean {
  const flatten = (s: string) => s.replace(/[、，,・/／\s]/g, "");
  return flatten(stored.join("")) === flatten(fetched);
}

type Diff = { id: string; field: string; stored: string; fetched: string };

function diffEntry(
  doc: EntryDoc,
  row: JaRow,
  record: BuildingRecord | null,
  pdfs: { ja: string[]; en: string[] },
  siblings: number,
): Diff[] {
  const d = doc.data;
  const diffs: Diff[] = [];
  const push = (field: string, stored: unknown, fetched: unknown) => {
    if (stored === undefined || fetched === undefined) return;
    if (stored !== fetched)
      diffs.push({ id: doc.id, field, stored: String(stored), fetched: String(fetched) });
  };
  const pushUrls = (field: string, stored: string[] | undefined, fetched: string[]) => {
    if (stored === undefined || fetched.length === 0) return;
    push(field, stored.join(" "), fetched.join(" "));
  };
  // A split entry's name is its own building, not the row wording — only a
  // number's sole entry can be compared against the list name.
  if (siblings === 1) push("name", d.name, row.name);
  push("completedYear", d.completedYear, row.completedYear);
  push("url", d.url, row.detailUrl);
  pushUrls("pdfJa", d.pdfJa, pdfs.ja);
  pushUrls("pdfEn", d.pdfEn, pdfs.en);
  if (record) {
    // The address is the datum lat/lng derive from, so a rewritten 所在地 is
    // the one page change that can silently invalidate a marker.
    push("location", d.location, record["所在地"]);
    push("use", d.use, record["主要用途"]);
    if (d.architects && record["設計者"] && !sameArchitects(d.architects, record["設計者"]))
      diffs.push({
        id: doc.id,
        field: "architects",
        stored: d.architects.join(" / "),
        fetched: record["設計者"],
      });
  }
  return diffs;
}

async function main(): Promise<void> {
  const docs: EntryDoc[] = [];
  for (const file of [...new Bun.Glob("*.md").scanSync(OUT_DIR)].sort()) {
    docs.push(parseEntry(file.slice(0, -3), await Bun.file(`${OUT_DIR}/${file}`).text()));
  }

  const jaRows = parseJaList(await fetchText(JA_LIST_URL));
  const enPdfs = parseEnPdfs(await fetchText(EN_LIST_URL));

  const known = new Set(docs.map((d) => d.data.number));
  const unknown = [...jaRows.values()].filter((row) => !known.has(row.number));

  const active = docs.filter((d) => !d.excluded);
  const siblingCount = new Map<number, number>();
  for (const d of active) {
    siblingCount.set(d.data.number, (siblingCount.get(d.data.number) ?? 0) + 1);
  }

  const filled: string[] = [];
  const diffs: Diff[] = [];
  const skipped: { id: string; reason: string }[] = [];
  const geocodeReport: string[] = [];

  for (const doc of active) {
    const d = doc.data;
    const row = jaRows.get(d.number);
    if (!row) {
      skipped.push({ id: doc.id, reason: `#${d.number} not on the JA list` });
      continue;
    }
    const siblings = siblingCount.get(d.number)!;

    let records: BuildingRecord[] = [];
    try {
      records = parseBuildingRecords(await fetchText(d.url ?? row.detailUrl));
    } catch (e) {
      skipped.push({ id: doc.id, reason: `detail fetch failed: ${e}` });
      continue;
    }
    const record = matchRecord(records, d.name, siblings);
    if (!record && records.length > 1)
      skipped.push({
        id: doc.id,
        reason: `#${d.number} no 建築データ record matches 「${d.name ?? "(no name)"}」 on ${row.detailUrl}`,
      });

    const enPdf = enPdfs.get(d.number);
    const pdfs = { ja: matchPdfs(row, d.name, siblings), en: enPdf ? [enPdf] : [] };

    // Fill absent fields only; a stored value always wins (ADR 0013).
    const before = JSON.stringify(d);
    if (d.name === undefined && siblings === 1) d.name = row.name;
    d.url ??= row.detailUrl;
    if (d.completedYear === undefined && row.completedYear !== undefined)
      d.completedYear = row.completedYear;
    if (d.pdfJa === undefined && pdfs.ja.length > 0) d.pdfJa = pdfs.ja;
    if (d.pdfEn === undefined && pdfs.en.length > 0) d.pdfEn = pdfs.en;
    if (record) {
      const use = record["主要用途"];
      if (d.use === undefined && use !== undefined) d.use = use;
      if (d.architects === undefined && record["設計者"]) d.architects = [record["設計者"]];
      const address = record["所在地"];
      if (d.location === undefined && address !== undefined) d.location = address;
    }
    // Geocode from the stored address, so a hand-written one (an entry the
    // page has no 所在地 for) grounds the marker just as well as a fetched one.
    if (d.lat === undefined || d.lng === undefined || !d.municipality) {
      const address = d.location;
      if (!address) {
        skipped.push({ id: doc.id, reason: `#${d.number} 所在地 unavailable for geocoding` });
      } else {
        const geo = await geocode(address);
        if (!geo) {
          skipped.push({ id: doc.id, reason: `#${d.number} geocode failed for 「${address}」` });
        } else {
          d.lat ??= geo.lat;
          d.lng ??= geo.lng;
          d.municipality ??= geo.municipality;
          geocodeReport.push(
            `${doc.id}\n    ${address} → ${geo.matchedTitle} (${geo.lat}, ${geo.lng})`,
          );
        }
      }
    }

    if (JSON.stringify(d) !== before) {
      await Bun.write(`${OUT_DIR}/${doc.id}.md`, renderEntry(doc));
      filled.push(doc.id);
    }

    diffs.push(...diffEntry(doc, row, record, pdfs, siblings));
  }

  if (filled.length > 0) {
    await Bun.$`oxfmt ${filled.map((id) => `${OUT_DIR}/${id}.md`)}`.quiet().nothrow();
  }

  console.log(`entries ${active.length}, filled ${filled.length}, diffs ${diffs.length}`);
  if (unknown.length > 0) {
    console.log("\nnot yet catalogued (create a NNNN-<slug>.md stub, or an excluded marker):");
    for (const row of unknown) console.log(`  #${row.number} ${row.name}\n    ${row.detailUrl}`);
  }
  if (diffs.length > 0) {
    console.log("\ndrift (stored value kept; apply by editing the entry):");
    for (const x of diffs) {
      console.log(`  ${x.id} ${x.field}:\n    stored:  ${x.stored}\n    fetched: ${x.fetched}`);
    }
  }
  if (skipped.length > 0) {
    console.log("\nskipped:");
    for (const s of skipped) console.log(`  ${s.id}: ${s.reason}`);
  }
  if (geocodeReport.length > 0) {
    console.log("\ngeocode report (review; pin outliers by editing the entry):");
    for (const line of geocodeReport) console.log(`  ${line}`);
  }
}

if (import.meta.main) {
  await main();
}

if (import.meta.vitest) {
  const { expect, test } = import.meta.vitest;

  test("parseJaList reads number, name, year, detail url, and pdf labels from a list <p> block", () => {
    const html = `<p><a href="/soshiki/115/4378.html">88　天草アーバ（東屋）　2013.3</a><br>
      <a href="/uploaded/attachment/186480.pdf">天草アーバ（PDFファイル：1MB）</a></p>`;
    const row = parseJaList(html).get(88)!;
    expect(row.name).toBe("天草アーバ（東屋）");
    expect(row.completedYear).toBe(2013);
    expect(row.detailUrl).toBe(`${BASE}/soshiki/115/4378.html`);
    expect(row.jaPdfs).toEqual([
      { label: "天草アーバ", url: `${BASE}/uploaded/attachment/186480.pdf` },
    ]);
  });

  test("an undated list row cut at the lone dash still yields a name, with no completedYear", () => {
    const html = `<p><a href="/soshiki/115/1.html">12　某整備 ‐ 概要</a></p>`;
    const row = parseJaList(html).get(12)!;
    expect(row.name).toBe("某整備");
    expect(row.completedYear).toBeUndefined();
  });

  test("parseEnPdfs keys pdf links by the row number in the first cell", () => {
    const html = `<tr><td>88</td><td><a href="/uploaded/attachment/42913.pdf">Amakusa</a></td></tr>`;
    expect(parseEnPdfs(html).get(88)).toBe(`${BASE}/uploaded/attachment/42913.pdf`);
  });

  test("parseBuildingRecords reads th/td tables and starts a new record at each 名称", () => {
    const html = `
      <tr><th>名称</th><td>甲棟</td></tr><tr><th>所在地</th><td>熊本市</td></tr>
      <tr><th>名称</th><td>乙棟</td></tr><tr><th>主要用途</th><td>集会所</td></tr>`;
    expect(parseBuildingRecords(html)).toEqual([
      { 名称: "甲棟", 所在地: "熊本市" },
      { 名称: "乙棟", 主要用途: "集会所" },
    ]);
  });

  test("parseBuildingRecords reads plain text lines, and 設計 must not fire inside 構造設計 or shadow 設計者", () => {
    const html = `<p>所在地　熊本市中央区</p><p>設計者　某設計室</p><p>構造設計　別会社</p>`;
    expect(parseBuildingRecords(html)).toEqual([{ 所在地: "熊本市中央区", 設計者: "某設計室" }]);
  });

  test("normalizeAddress strips lot numbers, notes, and multi-lot tails down to the geocodable 大字", () => {
    expect(normalizeAddress("熊本県天草市有明町上津浦１９５５（リップルランド）")).toBe(
      "熊本県天草市有明町上津浦",
    );
    expect(normalizeAddress("八代市鏡町内田453-1、453-2")).toBe("八代市鏡町内田");
  });

  test("municipalityOf keeps 政令市 wards and drops 郡 prefixes — the display form the table shows", () => {
    expect(municipalityOf("熊本県熊本市中央区水前寺")).toBe("熊本市中央区");
    expect(municipalityOf("熊本県阿蘇郡南小国町満願寺")).toBe("南小国町");
    expect(municipalityOf("熊本県")).toBeNull();
  });

  test("parseEntry enforces the NNNN-<slug> id and that the prefix matches number — a mismatch would lie about the official number in the URL", () => {
    const raw = "---\nnumber: 88\nname: 天草アーバ\n---\n";
    expect(parseEntry("0088-amakusa-arbor", raw).data.number).toBe(88);
    expect(() => parseEntry("0087-amakusa-arbor", raw)).toThrow(/prefix/);
    expect(() => parseEntry("amakusa-arbor", raw)).toThrow(/NNNN/);
  });

  test("renderEntry emits canonical field order, omits absent optionals, and preserves the human-owned body", () => {
    const raw =
      "---\nnumber: 88\nname: 天草アーバ\nlocation: 天草市有明町上津浦1955\nmunicipality: 天草市\nlat: 32.5\nlng: 130.3\narchitects:\n  - 某塾\nuse: 東屋\nurl: https://example.com/a.html\npdfJa:\n  - https://example.com/a-ja.pdf\n---\n\n訪問メモ。\n";
    expect(renderEntry(parseEntry("0088-amakusa-arbor", raw))).toBe(raw);
  });

  test("matchRecord takes a lone record only for a lone entry; several records with no name match must not guess", () => {
    const one = [{ 名称: "甲棟" }];
    const two = [{ 名称: "甲棟" }, { 名称: "乙棟" }];
    expect(matchRecord(one, undefined, 1)).toBe(one[0]);
    expect(matchRecord(one, undefined, 2)).toBeNull();
    expect(matchRecord(two, "乙棟増築", 2)).toBe(two[1]);
    expect(matchRecord(two, undefined, 1)).toBeNull();
  });

  test("a hand-split architects array is not drift: comparison strips separators", () => {
    expect(sameArchitects(["甲設計", "乙設計"], "甲設計・乙設計")).toBe(true);
    expect(sameArchitects(["甲設計"], "丙設計")).toBe(false);
  });

  test("diffEntry reports stored-vs-fetched drift for list fields but never coordinates, and skips the name of split entries", () => {
    const doc = parseEntry(
      "0064-sugita",
      "---\nnumber: 64\nname: 杉田団地\nmunicipality: 南小国町\nlat: 32.5\nlng: 130.3\ncompletedYear: 1994\nuse: 公営住宅\nurl: https://example.com/64.html\n---\n",
    );
    const row: JaRow = {
      number: 64,
      name: "町営住宅",
      completedYear: 1995,
      detailUrl: "https://example.com/64.html",
      jaPdfs: [],
    };
    const noPdfs = { ja: [], en: [] };
    const asSplit = diffEntry(doc, row, null, noPdfs, 2);
    expect(asSplit).toEqual([
      { id: "0064-sugita", field: "completedYear", stored: "1994", fetched: "1995" },
    ]);
    const asSole = diffEntry(doc, row, null, noPdfs, 1);
    expect(asSole.map((x) => x.field).sort()).toEqual(["completedYear", "name"]);
  });

  test("a rewritten 所在地 is reported as drift — it is the datum lat/lng derive from, so it must not change unnoticed", () => {
    const doc = parseEntry(
      "0002-hodakubo",
      "---\nnumber: 2\nname: 県営保田窪第一団地\nlocation: 熊本市帯山1丁目28\nmunicipality: 熊本市中央区\nlat: 32.8\nlng: 130.7\nuse: 公営住宅\n---\n",
    );
    const row: JaRow = {
      number: 2,
      name: "県営保田窪第一団地",
      completedYear: undefined,
      detailUrl: "https://example.com/2.html",
      jaPdfs: [],
    };
    const diffs = diffEntry(doc, row, { 所在地: "熊本市中央区帯山1丁目28" }, { ja: [], en: [] }, 1);
    expect(diffs).toEqual([
      {
        id: "0002-hodakubo",
        field: "location",
        stored: "熊本市帯山1丁目28",
        fetched: "熊本市中央区帯山1丁目28",
      },
    ]);
  });
}
