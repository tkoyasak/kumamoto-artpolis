/// <reference types="vitest/importMeta" />

import { atom } from "nanostores";

// The hover state shared across islands (Astro bundles this module once, so
// all read the same atom). `marker` is the map marker key — an entry href;
// `row` is the hovering table row's own href, absent when the marker itself
// is hovered/focused. Re-seeded on every swap by the map script — see
// EntriesMap's syncVisibility.
export type Hovered = {
  marker: string;
  row?: string;
} | null;

export const $hovered = atom<Hovered>(null);

// A row lights up for its own hover, or when its entry's marker is hovered
// directly. Keying on the marker alone would also light up sibling rows —
// on /status, other visits to the same entry.
export const isRowHighlighted = (hovered: Hovered, rowHref: string, markerHref: string): boolean =>
  hovered !== null &&
  (hovered.row !== undefined ? hovered.row === rowHref : hovered.marker === markerHref);

if (import.meta.vitest) {
  const { expect, test } = import.meta.vitest;

  test("a row hover highlights only that row — sibling visits of the same entry stay dark; a direct marker hover lights every row of the entry", () => {
    const marker = "/projects/foo";
    expect(isRowHighlighted({ marker, row: "/status/a" }, "/status/a", marker)).toBe(true);
    expect(isRowHighlighted({ marker, row: "/status/a" }, "/status/b", marker)).toBe(false);
    expect(isRowHighlighted({ marker }, "/status/a", marker)).toBe(true);
    expect(isRowHighlighted({ marker }, "/status/b", marker)).toBe(true);
    expect(isRowHighlighted(null, "/status/a", marker)).toBe(false);
  });
}
