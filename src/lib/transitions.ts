// View Transition names shared between list pages and detail pages. No
// astro:content imports, so safe to import from the Preact client island.

// Same name on the home and detail entry tables, so the header stays put
// across the swap.
export const ENTRY_HEAD_VT = "entry-head";

// Likewise for /status and /status/<id>.
export const STATUS_HEAD_VT = "status-head";

// Keyed by href (unique site-wide). On a list page apply it only to the row
// being clicked — rows sharing a name would each become their own transition
// group; a detail page applies it to its single row.
export function rowTransitionName(href: string): string {
  return `row${href.replace(/[^a-zA-Z0-9]+/g, "-")}`;
}

if (import.meta.vitest) {
  const { expect, test } = import.meta.vitest;

  test("a row's transition name is a CSS-safe ident: hrefs contain slashes, which view-transition-name forbids", () => {
    const name = rowTransitionName("/projects/foo-bar");
    expect(name).toBe("row-projects-foo-bar");
    expect(name).toMatch(/^[a-zA-Z][a-zA-Z0-9-]*$/);
  });

  test("same-id rows in different collections get distinct transition names, so a morph can't pair the wrong rows", () => {
    expect(rowTransitionName("/projects/foo")).not.toBe(rowTransitionName("/kap92/foo"));
  });
}
