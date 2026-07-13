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
  const { url, pdfs } = entry.data;
  const links: { label: string; url: string }[] = [];
  if (url) {
    links.push({
      label: entry.collection === "projects" ? "紹介ページ（熊本県）" : "公式サイト",
      url,
    });
  }
  const ja = pdfs?.ja ?? [];
  links.push(
    ...ja.map((u, i) => ({
      label: ja.length > 1 ? `PDF（日本語・${i + 1}）` : "PDF（日本語）",
      url: u,
    })),
  );
  if (pdfs?.en) links.push({ label: "PDF（英語）", url: pdfs.en });
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

  test("ja PDF labels are numbered only when there are several, matching how the imported bodies used to read", () => {
    const one = entryLinks(active({ url: "u", pdfs: { ja: ["p1"] } }));
    expect(one.map((l) => l.label)).toEqual(["紹介ページ（熊本県）", "PDF（日本語）"]);
    const two = entryLinks(active({ url: "u", pdfs: { ja: ["p1", "p2"], en: "e" } }));
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
