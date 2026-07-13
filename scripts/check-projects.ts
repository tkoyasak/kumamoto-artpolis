#!/usr/bin/env -S bun run

/// <reference types="bun-types" />

// Check catalog entries against their own source page.
//
// **This tool never writes.** The entries are hand-curated (ADR 0016) — the
// catalog is small enough to read end to end — so the tool's whole job is to
// fetch the page an entry's `url` points at and put what it says next to what
// the entry says, for a human to eyeball. Applying a difference means editing
// the md.
//
//   bun run check-projects                      # every entry
//   bun run check-projects src/content/projects/0088-amakusa-arbor.md ...
//
// It reads nothing but the entry's own page, so it checks exactly the three
// fields that page's 建築データ block carries — `location` (所在地), `use`
// (主要用途), `architects` (設計者) — and geocodes `location` for an entry
// that has no coordinates yet. `name` and `completedYear` come from the
// prefecture's *list* page, not this one, and are not checked; neither are the
// body's PDF links.
//
// `location` is not compared verbatim: the stored address is the curated one —
// the 政令市 ward filled in where the prefecture's pre-2012 wording omits it
// (ADR 0016) — so the comparison normalizes the ward and the trailing link
// notes the pages append.

import { parse as parseYaml } from "yaml";

const ENTRY_DIR = "src/content/projects";
const FETCH_DELAY_MS = 300;

type EntryData = {
  number: number;
  name: string;
  location?: string;
  lat?: number;
  lng?: number;
  architects?: string[];
  completedYear?: number;
  use?: string;
  url?: string;
};
type EntryDoc = { id: string; data: EntryData; excluded: boolean };

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
    .replaceAll("&nbsp;", " ")
    .replaceAll("&minus;", "-");
}

function stripTags(s: string): string {
  return decodeEntities(s.replace(/<br\s*\/?>/g, " ").replace(/<[^>]+>/g, ""))
    .replaceAll("　", " ")
    .replace(/\s+/g, " ")
    .trim();
}

// --- the source page (建築データ) ---------------------------------------------

// A page holds one 建築データ block per building; a new 名称 starts a new
// record. The markup varies by page age: th/td table rows, td/td table rows,
// or plain "所在地　value" text lines — one combined scan covers all three, in
// document order. The newer pages space the labels out (「所 在 地：」), so
// every label tolerates spaces between its characters.
const FIELD_ALIASES: Record<string, string> = {
  施設名: "名称",
  建物用途: "主要用途",
  用途: "主要用途",
  設計: "設計者",
};
const FIELDS = new Set(["名称", "ふりがな", "所在地", "主要用途", "事業主体", "設計者"]);
const spaced = (label: string) => label.split("").join("\\s?");

// 設計 must not fire inside 構造設計/電気設計 or shadow 設計者.
const RECORD_PATTERN = new RegExp(
  `<t[hd][^>]*>([\\s\\S]*?)</t[hd]>\\s*<td[^>]*>([\\s\\S]*?)</td>|(${[
    spaced("名称"),
    "施設名",
    spaced("所在地"),
    spaced("主要用途"),
    "建物用途",
    spaced("用途"),
    spaced("事業主体"),
    spaced("設計者"),
    `(?<![構造電気設備機械])${spaced("設計")}(?!\\s?者)`,
  ].join("|")})[　：:／｜ ]+([^<\\r\\n|]+)`,
  "g",
);

function parseBuildingRecords(html: string): BuildingRecord[] {
  const records: BuildingRecord[] = [];
  let current: BuildingRecord | null = null;
  for (const m of html.matchAll(RECORD_PATTERN)) {
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

type Geocoded = { lat: number; lng: number; matchedTitle: string };

function normalizeAddress(addr: string): string {
  return addr
    .replace(/[（(＜].*$/, "") // trailing "（○○HP）https://…＜外部リンク＞" notes
    .replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0))
    .replace(/[−ー―‐]/g, "-")
    .replace(/\s+/g, "")
    .replace(/[、・].*$/, "") // multi-lot addresses: keep the first lot
    .replace(/番地?の?\d*.*$|地先.*$|地内.*$/, "")
    .replace(/-?\d+(-\d+)*$/, "");
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

// The GSI search falls back to a municipality centroid when it can't match the
// 大字, and it fuzzy-matches (春日 → 春竹町), so a hit only counts when the
// 大字/町 it matched actually appears in the queried address.
async function geocode(address: string): Promise<Geocoded | null> {
  const addr = normalizeAddress(address).replace(/^熊本県/, "");
  const candidates = [`熊本県${addr}`];
  // 郡 spellings drift (芦北郡 vs the official 葦北郡) — retry without it.
  if (/^.+?郡/.test(addr)) candidates.push(`熊本県${addr.replace(/^.+?郡/, "")}`);
  for (const q of candidates) {
    for (const hit of await gsiSearch(q)) {
      const title = hit.title.replace(/^熊本県/, "").replace(/^.+?郡/, "");
      const municipality = title.match(/^(?:熊本市(?:中央|東|西|南|北)区|.+?[市町村])/)?.[0];
      if (!municipality) continue;
      const beyond = title.slice(municipality.length);
      if (beyond === "" || !q.includes(beyond.slice(0, 2))) continue;
      return {
        lat: Number(hit.lat.toFixed(4)),
        lng: Number(hit.lng.toFixed(4)),
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
  const data = (parseYaml(m[1]!) ?? {}) as EntryData & { excluded?: boolean };
  if (!ID_PATTERN.test(id)) throw new Error(`${id}: id must be NNNN-<slug>`);
  if (!Number.isInteger(data.number) || data.number <= 0)
    throw new Error(`${id}: missing or invalid number`);
  if (Number(id.slice(0, 4)) !== data.number)
    throw new Error(`${id}: filename prefix does not match number ${data.number}`);
  const { excluded, ...rest } = data;
  return { id, data: rest, excluded: excluded === true };
}

// --- comparison ------------------------------------------------------------------

// The curated address carries the ward the prefecture's older wording omits and
// drops the link note it appends — compare on what the two can agree about.
function sameAddress(stored: string, fetched: string): boolean {
  const flatten = (s: string) =>
    s
      .replace(/[（(＜].*$/, "")
      .replace(/^熊本県/, "")
      .replace(/^熊本市(?:中央|東|西|南|北)区/, "熊本市")
      .replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0))
      .replace(/[−ー―‐]/g, "-")
      .replace(/[\s　]/g, "");
  return flatten(stored) === flatten(fetched);
}

// Architects are one run-on string on the page but a splittable array in the
// entry; compare with separators stripped so a hand split isn't reported.
function sameArchitects(stored: string[], fetched: string): boolean {
  const flatten = (s: string) => s.replace(/[、，,・/／\s]/g, "");
  return flatten(stored.join("")) === flatten(fetched);
}

// One page can describe several buildings — a split row's entries share it, so
// each must find its own 建築データ record by name. A lone record needs no
// match; guessing among several would attach another building's data.
function matchRecord(
  records: BuildingRecord[],
  name: string,
  siblings: number,
): BuildingRecord | null {
  const byName = records.find(
    (r) => r["名称"] && (name.includes(r["名称"]) || r["名称"]!.includes(name)),
  );
  if (byName) return byName;
  if (records.length === 1 && siblings === 1) return records[0]!;
  return null;
}

type Diff = { field: string; entry: string; page: string };

function diffEntry(doc: EntryDoc, record: BuildingRecord): Diff[] {
  const d = doc.data;
  const diffs: Diff[] = [];
  const address = record["所在地"];
  if (d.location && address && !sameAddress(d.location, address))
    diffs.push({ field: "location", entry: d.location, page: address });
  const use = record["主要用途"];
  if (d.use && use && d.use !== use) diffs.push({ field: "use", entry: d.use, page: use });
  const architects = record["設計者"];
  if (d.architects && architects && !sameArchitects(d.architects, architects))
    diffs.push({ field: "architects", entry: d.architects.join(" / "), page: architects });
  return diffs;
}

// --- main --------------------------------------------------------------------

async function readEntries(paths: string[]): Promise<EntryDoc[]> {
  const docs: EntryDoc[] = [];
  for (const path of paths) {
    const id = path.split("/").pop()!.slice(0, -3);
    docs.push(parseEntry(id, await Bun.file(path).text()));
  }
  return docs;
}

async function main(): Promise<void> {
  const args = Bun.argv.slice(2);
  const all = [...new Bun.Glob("*.md").scanSync(ENTRY_DIR)].sort().map((f) => `${ENTRY_DIR}/${f}`);
  const docs = (await readEntries(args.length > 0 ? args : all)).filter((d) => !d.excluded);

  // Siblings are counted over the whole catalog, not just the given files: a
  // split row's entries share their number wherever they live.
  const siblingCount = new Map<number, number>();
  for (const doc of await readEntries(all)) {
    if (!doc.excluded)
      siblingCount.set(doc.data.number, (siblingCount.get(doc.data.number) ?? 0) + 1);
  }

  let checked = 0;
  const reports: string[] = [];
  const notes: string[] = [];

  for (const doc of docs) {
    const d = doc.data;
    if (d.url) {
      let records: BuildingRecord[] = [];
      try {
        records = parseBuildingRecords(await fetchText(d.url));
      } catch (e) {
        notes.push(`${doc.id}: fetch failed: ${e}`);
        continue;
      }
      const record = matchRecord(records, d.name, siblingCount.get(d.number) ?? 1);
      if (!record) {
        notes.push(`${doc.id}: no 建築データ record for 「${d.name}」 on ${d.url} — unchecked`);
      } else {
        checked++;
        const diffs = diffEntry(doc, record);
        if (diffs.length > 0) {
          const body = diffs
            .map((x) => `  ${x.field}\n    entry: ${x.entry}\n    page:  ${x.page}`)
            .join("\n");
          reports.push(`${doc.id}\n${body}`);
        }
      }
    } else {
      notes.push(`${doc.id}: no url — nothing to check against`);
    }

    if (d.lat === undefined || d.lng === undefined) {
      const geo = d.location ? await geocode(d.location) : null;
      notes.push(
        geo
          ? `${doc.id}: no coordinates — 「${d.location}」 geocodes to ${geo.lat}, ${geo.lng} (${geo.matchedTitle})`
          : `${doc.id}: no coordinates, and 「${d.location ?? "(no location)"}」 could not be geocoded`,
      );
    }
  }

  console.log(`checked ${checked} entries, ${reports.length} with differences`);
  if (reports.length > 0) {
    console.log("\ndifferences (the entry wins — apply one by editing it):\n");
    for (const r of reports) console.log(`${r}\n`);
  }
  if (notes.length > 0) {
    console.log("notes:");
    for (const n of notes) console.log(`  ${n}`);
  }
}

if (import.meta.main) {
  await main();
}

if (import.meta.vitest) {
  const { expect, test } = import.meta.vitest;

  test("parseBuildingRecords reads th/td tables and starts a new record at each 名称", () => {
    const html = `
      <tr><th>名称</th><td>甲棟</td></tr><tr><th>所在地</th><td>熊本市</td></tr>
      <tr><th>名称</th><td>乙棟</td></tr><tr><th>主要用途</th><td>集会所</td></tr>`;
    expect(parseBuildingRecords(html)).toEqual([
      { 名称: "甲棟", 所在地: "熊本市" },
      { 名称: "乙棟", 主要用途: "集会所" },
    ]);
  });

  test("a spaced label (「所 在 地：」, how the newer pages write it) is read too — missing it cost four entries their address", () => {
    const html = `<p>名 称：立田山公衆トイレ</p><p>所 在 地：熊本県熊本市北区乗越ヶ丘</p><p>用 途：公衆トイレ</p>`;
    expect(parseBuildingRecords(html)).toEqual([
      { 名称: "立田山公衆トイレ", 所在地: "熊本県熊本市北区乗越ヶ丘", 主要用途: "公衆トイレ" },
    ]);
  });

  test("parseBuildingRecords reads plain text lines, and 設計 must not fire inside 構造設計 or shadow 設計者", () => {
    const html = `<p>所在地　熊本市中央区</p><p>設計者　某設計室</p><p>構造設計　別会社</p>`;
    expect(parseBuildingRecords(html)).toEqual([{ 所在地: "熊本市中央区", 設計者: "某設計室" }]);
  });

  test("the curated address is not a difference: the ward it fills in and the note the page appends are normalized away", () => {
    expect(sameAddress("熊本市中央区草葉町5-13", "熊本市草葉町5-13")).toBe(true);
    expect(
      sameAddress(
        "芦北郡津奈木町岩城1601",
        "芦北郡津奈木町岩城1601 （つなぎ百貨堂HP）http://x＜外部リンク＞",
      ),
    ).toBe(true);
    expect(sameAddress("熊本市中央区帯山1-23", "熊本市帯山1−23")).toBe(true);
    expect(sameAddress("熊本市中央区草葉町5-13", "熊本市草葉町6-13")).toBe(false);
  });

  test("a hand-split architects array is not a difference: the comparison strips separators", () => {
    expect(sameArchitects(["甲設計", "乙設計"], "甲設計・乙設計")).toBe(true);
    expect(sameArchitects(["甲設計"], "丙設計")).toBe(false);
  });

  test("parseEntry enforces the NNNN-<slug> id and that its prefix matches number", () => {
    const raw = "---\nnumber: 88\nname: 天草アーバ\nlocation: 天草市有明町\nuse: 東屋\n---\n";
    expect(parseEntry("0088-amakusa-arbor", raw).data.number).toBe(88);
    expect(() => parseEntry("0087-amakusa-arbor", raw)).toThrow(/prefix/);
    expect(() => parseEntry("amakusa-arbor", raw)).toThrow(/NNNN/);
  });

  test("matchRecord takes a lone record only for a lone entry; several records with no name match must not be guessed between", () => {
    const one = [{ 名称: "甲棟" }];
    const two = [{ 名称: "甲棟" }, { 名称: "乙棟" }];
    expect(matchRecord(one, "別名", 1)).toBe(one[0]);
    expect(matchRecord(one, "別名", 2)).toBeNull();
    expect(matchRecord(two, "乙棟増築", 2)).toBe(two[1]);
    expect(matchRecord(two, "別名", 1)).toBeNull();
  });

  test("diffEntry compares only what the page carries — location, use, architects — and never the coordinates", () => {
    const doc = parseEntry(
      "0064-sugita",
      "---\nnumber: 64\nname: 杉田団地\nlocation: 南小国町中杉田1650\nlat: 32.5\nlng: 130.3\nuse: 公営住宅\n---\n",
    );
    expect(diffEntry(doc, { 所在地: "南小国町中杉田1650", 主要用途: "町営住宅" })).toEqual([
      { field: "use", entry: "公営住宅", page: "町営住宅" },
    ]);
    expect(diffEntry(doc, { 所在地: "南小国町中杉田1650", 主要用途: "公営住宅" })).toEqual([]);
  });
}
