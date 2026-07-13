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

// The one link the frontmatter owns: the entry's page on the prefecture site
// (kap92 has none). Every other link — the PDFs — is written by hand in the
// body (ADR 0016).
export function sourceLink(entry: ActiveEntry): { label: string; url: string } | null {
  const { url } = entry.data;
  if (!url) return null;
  return {
    label: entry.collection === "projects" ? "紹介ページ（熊本県）" : "公式サイト",
    url,
  };
}

if (import.meta.vitest) {
  const { expect, test } = import.meta.vitest;

  const entry = (collection: "projects" | "kap92", data: Record<string, unknown>) =>
    ({ collection, id: "0001-x", data }) as unknown as ActiveEntry;

  test("isActive keys on the excluded flag, so a marker row can never reach the table, map, or a page", () => {
    expect(isActive({ collection: "projects", id: "a", data: { url: "x" } } as CatalogEntry)).toBe(
      true,
    );
    expect(
      isActive({ collection: "projects", id: "a", data: { excluded: true } } as CatalogEntry),
    ).toBe(false);
  });

  test("the source link is labelled by collection, and an entry without a url (kap92) has none", () => {
    expect(sourceLink(entry("projects", { url: "u" }))).toEqual({
      label: "紹介ページ（熊本県）",
      url: "u",
    });
    expect(sourceLink(entry("kap92", { url: "u" }))?.label).toBe("公式サイト");
    expect(sourceLink(entry("kap92", {}))).toBeNull();
  });
}
