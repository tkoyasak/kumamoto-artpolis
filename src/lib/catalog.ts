import type { CollectionEntry } from "astro:content";

// The catalog collections mix visitable entries with excluded markers
// (official-list rows that aren't buildings; ADR 0013). The site renders
// only active entries — every consumer narrows through here.
export type CatalogEntry = CollectionEntry<"projects"> | CollectionEntry<"kap92">;
export type ActiveEntry<E extends CatalogEntry = CatalogEntry> = E & {
  data: Exclude<E["data"], { excluded: true }>;
};

export function isActive<E extends CatalogEntry>(entry: E): entry is ActiveEntry<E> {
  return !("excluded" in entry.data);
}

// The detail pages' official-links list, derived from the frontmatter the
// sync tool maintains; labels are presentation, not data.
export function entryLinks(entry: ActiveEntry): { label: string; url: string }[] {
  const { url, pdfJa = [], pdfEn = [] } = entry.data;
  const links: { label: string; url: string }[] = [];
  if (url) {
    links.push({
      label: entry.collection === "projects" ? "紹介ページ（熊本県）" : "公式サイト",
      url,
    });
  }
  const numbered = (urls: string[], lang: string) =>
    urls.map((u, i) => ({
      label: urls.length > 1 ? `PDF（${lang}・${i + 1}）` : `PDF（${lang}）`,
      url: u,
    }));
  links.push(...numbered(pdfJa, "日本語"), ...numbered(pdfEn, "英語"));
  return links;
}

if (import.meta.vitest) {
  const { expect, test } = import.meta.vitest;

  const active = (data: Record<string, unknown>) =>
    ({ collection: "projects", id: "0001-x", data }) as unknown as ActiveEntry;

  test("isActive keys on the excluded flag, so a marker row can never reach the table, map, or a page", () => {
    expect(isActive({ collection: "projects", id: "a", data: { url: "x" } } as CatalogEntry)).toBe(
      true,
    );
    expect(
      isActive({ collection: "projects", id: "a", data: { excluded: true } } as CatalogEntry),
    ).toBe(false);
  });

  test("PDF labels are numbered per language only when that language has several, matching how the imported bodies used to read", () => {
    const one = entryLinks(active({ url: "u", pdfJa: ["p1"], pdfEn: ["e1"] }));
    expect(one.map((l) => l.label)).toEqual([
      "紹介ページ（熊本県）",
      "PDF（日本語）",
      "PDF（英語）",
    ]);
    const two = entryLinks(active({ url: "u", pdfJa: ["p1", "p2"], pdfEn: ["e1"] }));
    expect(two.map((l) => l.label)).toEqual([
      "紹介ページ（熊本県）",
      "PDF（日本語・1）",
      "PDF（日本語・2）",
      "PDF（英語）",
    ]);
  });

  test("an entry without pdfs still links its source page, and one without a url (kap92) gets no links at all", () => {
    expect(entryLinks(active({ url: "u" }))).toEqual([{ label: "紹介ページ（熊本県）", url: "u" }]);
    expect(entryLinks(active({}))).toEqual([]);
  });
}
