#!/usr/bin/env -S bun run

/// <reference types="bun-types" />

// Import Projects entries from the prefecture's official list into
// src/content/projects/, driven by scripts/data/projects-registry.json
// (number → id; the registry is the reviewed, permanent id assignment).
//
// Sources, per entry:
// - JA list page: name (the official list wording, annotations included),
//   completion year, detail-page URL, JA PDF links.
// - EN list page: EN PDF link.
// - JA detail page (建築データ table): 所在地 (geocoded to lat/lng and the
//   municipality incl. ward), 主要用途 (`use`), 設計者 (`architects`, one
//   unsplit string).
// - GSI address search: 所在地 → lat/lng. Banchi-level precision isn't
//   available; matches are 大字/丁目 centroids — review the printed geocode
//   report and pin outliers via registry `overrides`.
//
// Existing entry files are never overwritten, so the script is safe to
// re-run when the prefecture appends new numbers or after filling registry
// overrides for rows reported as skipped.

const BASE = "https://www.pref.kumamoto.jp";
const JA_LIST_URL = `${BASE}/soshiki/115/83273.html`;
const EN_LIST_URL = `${BASE}/soshiki/115/4579.html`;
const OUT_DIR = "src/content/projects";
const REGISTRY = new URL("data/projects-registry.json", import.meta.url).pathname;

const FETCH_DELAY_MS = 300;

type Overrides = {
  address?: string;
  use?: string;
  architects?: string[];
  lat?: number;
  lng?: number;
  municipality?: string;
  completedYear?: number | undefined;
};
type Split = { id: string; name: string; overrides?: Overrides };
type RegistryEntry = { number: number; id?: string; splits?: Split[]; overrides?: Overrides };
type Registry = {
  excluded: { number: number; reason: string }[];
  entries: RegistryEntry[];
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
async function fetchText(url: string): Promise<string> {
  const wait = lastFetch + FETCH_DELAY_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastFetch = Date.now();
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  return await res.text();
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
  const json = (await (async () => {
    const wait = lastFetch + FETCH_DELAY_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastFetch = Date.now();
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as unknown;
  })()) as { geometry: { coordinates: [number, number] }; properties: { title: string } }[] | null;
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

// --- entry rendering ---------------------------------------------------------

function yamlStr(s: string): string {
  return /[:#"'\[\]{}&*!|>%@`]/.test(s) || /^\s|\s$/.test(s) ? JSON.stringify(s) : s;
}

function renderEntry(args: {
  number: number;
  name: string;
  architects: string[];
  lat: number;
  lng: number;
  completedYear: number | undefined;
  municipality: string;
  use: string;
  links: { label: string; url: string }[];
}): string {
  const lines = [
    "---",
    `number: ${args.number}`,
    `name: ${yamlStr(args.name)}`,
    "architects:",
    ...args.architects.map((a) => `  - ${yamlStr(a)}`),
    `lat: ${args.lat}`,
    `lng: ${args.lng}`,
    ...(args.completedYear ? [`completedYear: ${args.completedYear}`] : []),
    `municipality: ${yamlStr(args.municipality)}`,
    `use: ${yamlStr(args.use)}`,
    "---",
    "",
    ...args.links.map((l) => `- [${l.label}](${l.url})`),
    "",
  ];
  return lines.join("\n");
}

// --- main --------------------------------------------------------------------

const registry = (await Bun.file(REGISTRY).json()) as Registry;

const ids = registry.entries.flatMap((e) => (e.splits ? e.splits.map((s) => s.id) : [e.id!]));
for (const id of ids) {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) throw new Error(`invalid id: ${id}`);
}
if (new Set(ids).size !== ids.length) throw new Error("duplicate ids in registry");

const jaRows = parseJaList(await fetchText(JA_LIST_URL));
const enPdfs = parseEnPdfs(await fetchText(EN_LIST_URL));

const created: string[] = [];
const existed: string[] = [];
const skipped: { id: string; reason: string }[] = [];
const geocodeReport: string[] = [];

for (const entry of registry.entries) {
  const row = jaRows.get(entry.number);
  const outputs: Split[] = entry.splits ?? [
    {
      id: entry.id!,
      name: row?.name ?? "",
      ...(entry.overrides ? { overrides: entry.overrides } : {}),
    },
  ];

  const pending: typeof outputs = [];
  for (const o of outputs) {
    if (await Bun.file(`${OUT_DIR}/${o.id}.md`).exists()) existed.push(o.id);
    else pending.push(o);
  }
  if (pending.length === 0) continue;

  if (!row) {
    for (const o of pending)
      skipped.push({ id: o.id, reason: `#${entry.number} not on the JA list` });
    continue;
  }

  let records: BuildingRecord[] = [];
  try {
    records = parseBuildingRecords(await fetchText(row.detailUrl));
  } catch (e) {
    for (const o of pending) skipped.push({ id: o.id, reason: `detail fetch failed: ${e}` });
    continue;
  }

  for (const o of pending) {
    const ov = o.overrides ?? {};
    // Match the building record by name containment (multi-building pages);
    // fall back to the first record.
    const record =
      records.find(
        (r) => r["名称"] && (o.name.includes(r["名称"]) || r["名称"].includes(o.name)),
      ) ??
      records[0] ??
      {};

    const address = ov.address ?? record["所在地"];
    const use = ov.use ?? record["主要用途"];
    const architects = ov.architects ?? (record["設計者"] ? [record["設計者"]] : undefined);
    if (!address && (ov.lat === undefined || ov.lng === undefined || !ov.municipality)) {
      skipped.push({ id: o.id, reason: `#${entry.number} 所在地 missing on ${row.detailUrl}` });
      continue;
    }
    if (!use) {
      skipped.push({ id: o.id, reason: `#${entry.number} 主要用途 missing on ${row.detailUrl}` });
      continue;
    }
    if (!architects) {
      skipped.push({ id: o.id, reason: `#${entry.number} 設計者 missing on ${row.detailUrl}` });
      continue;
    }

    let lat = ov.lat;
    let lng = ov.lng;
    let municipality = ov.municipality;
    if (lat === undefined || lng === undefined || !municipality) {
      const geo = address ? await geocode(address) : null;
      if (!geo) {
        skipped.push({ id: o.id, reason: `#${entry.number} geocode failed for 「${address}」` });
        continue;
      }
      lat ??= geo.lat;
      lng ??= geo.lng;
      municipality ??= geo.municipality;
      geocodeReport.push(`${o.id}\n    ${address} → ${geo.matchedTitle} (${geo.lat}, ${geo.lng})`);
    }

    // Body: official links only. On a split row, keep just the JA PDFs
    // naming this building (falling back to all); a single entry gets all.
    const matchingPdfs = entry.splits
      ? row.jaPdfs.filter((p) => o.name.includes(p.label) || p.label.includes(o.name))
      : [];
    const jaPdfs = matchingPdfs.length > 0 ? matchingPdfs : row.jaPdfs;
    const links = [
      { label: "紹介ページ（熊本県）", url: row.detailUrl },
      ...jaPdfs.map((p, i) => ({
        label: jaPdfs.length > 1 ? `PDF（日本語・${i + 1}）` : "PDF（日本語）",
        url: p.url,
      })),
    ];
    const enPdf = enPdfs.get(entry.number);
    if (enPdf) links.push({ label: "PDF（英語）", url: enPdf });

    await Bun.write(
      `${OUT_DIR}/${o.id}.md`,
      renderEntry({
        number: entry.number,
        name: o.name,
        architects,
        lat,
        lng,
        completedYear: ov.completedYear ?? row.completedYear,
        municipality,
        use,
        links,
      }),
    );
    created.push(o.id);
  }
}

if (created.length > 0) {
  await Bun.$`oxfmt ${created.map((id) => `${OUT_DIR}/${id}.md`)}`.quiet().nothrow();
}

console.log(`created ${created.length}, existing ${existed.length}, skipped ${skipped.length}`);
if (skipped.length > 0) {
  console.log("\nskipped:");
  for (const s of skipped) console.log(`  ${s.id}: ${s.reason}`);
}
if (geocodeReport.length > 0) {
  console.log("\ngeocode report (review; pin outliers via registry overrides):");
  for (const line of geocodeReport) console.log(`  ${line}`);
}

export {};
