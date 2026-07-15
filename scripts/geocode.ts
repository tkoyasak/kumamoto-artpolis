#!/usr/bin/env -S bun run

/// <reference types="bun-types" />

// Print the coordinates for a 所在地; you paste them into an entry's frontmatter.
//
//   bun run geocode 熊本市中央区草葉町5-13
//   bun run geocode "阿蘇郡南阿蘇村河陽5343-1" "天草市有明町上津浦1955"

type Hit = { lat: number; lng: number; title: string };

function normalizeAddress(addr: string): string {
  return addr
    .replace(/[（(＜].*$/, "")
    .replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0))
    .replace(/[−ー―‐]/g, "-")
    .replace(/\s+/g, "")
    .replace(/[、・].*$/, "")
    .replace(/番地?の?\d*.*$|地先.*$|地内.*$/, "")
    .replace(/-?\d+(-\d+)*$/, "");
}

async function search(q: string): Promise<Hit[]> {
  const url = `https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(q)}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const json = (await res.json()) as {
    geometry: { coordinates: [number, number] };
    properties: { title: string };
  }[];
  return json.map((hit) => ({
    lat: hit.geometry.coordinates[1],
    lng: hit.geometry.coordinates[0],
    title: hit.properties.title,
  }));
}

// The GSI search falls back to a municipality centroid when it cannot match the
// 大字, and it fuzzy-matches (春日 → 春竹町); a hit is only trusted when the
// 大字/町 it matched appears in the query. Its 郡 spellings also drift (芦北郡
// vs the official 葦北郡).
export async function geocode(address: string): Promise<Hit | null> {
  const addr = normalizeAddress(address).replace(/^熊本県/, "");
  const queries = [`熊本県${addr}`];
  if (/^.+?郡/.test(addr)) queries.push(`熊本県${addr.replace(/^.+?郡/, "")}`);

  for (const q of queries) {
    for (const hit of await search(q)) {
      const title = hit.title.replace(/^熊本県/, "").replace(/^.+?郡/, "");
      const municipality = title.match(/^(?:熊本市(?:中央|東|西|南|北)区|.+?[市町村])/)?.[0];
      if (!municipality) continue;
      const beyond = title.slice(municipality.length);
      if (beyond === "" || !q.includes(beyond.slice(0, 2))) continue;
      return { lat: Number(hit.lat.toFixed(4)), lng: Number(hit.lng.toFixed(4)), title: hit.title };
    }
  }
  return null;
}

async function main(): Promise<void> {
  const addresses = Bun.argv.slice(2);
  if (addresses.length === 0) {
    console.error("usage: bun run geocode <address>...");
    process.exit(1);
  }
  for (const address of addresses) {
    const hit = await geocode(address);
    console.log(
      hit
        ? `${address}\n  lat: ${hit.lat}\n  lng: ${hit.lng}\n  (matched ${hit.title})`
        : `${address}\n  no match — set the coordinates by hand`,
    );
  }
}

if (import.meta.main) {
  await main();
}

if (import.meta.vitest) {
  const { expect, test } = import.meta.vitest;

  test("the lot number is stripped: the GSI search resolves 大字/丁目, and a banchi makes it miss entirely", () => {
    expect(normalizeAddress("熊本市中央区草葉町5-13")).toBe("熊本市中央区草葉町");
    expect(normalizeAddress("宇土市境目町字帆立町521-1")).toBe("宇土市境目町字帆立町");
  });

  test("a multi-lot address keeps only its first lot, and the page's trailing link note is dropped", () => {
    expect(normalizeAddress("芦北郡津奈木町岩城1601（つなぎ百貨堂HP）http://x")).toBe(
      "芦北郡津奈木町岩城",
    );
    expect(normalizeAddress("熊本市中央区帯山1丁目28・29")).toBe("熊本市中央区帯山1丁目");
  });
}
