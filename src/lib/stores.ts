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

// Whether a marker (keyed by its entry href) draws its outline ring. The ring
// means "this entry is the subject": a direct marker hover (anywhere), a
// home-catalog hover of the entry's own row, the entry's own detail page at
// rest, or an in-flight navigation to it. It is suppressed where the marker is
// mere context: a /status visit-row hover (its `row` href differs from the
// marker key) and a /status/<id> page *at rest* (focus is the visited entry, so
// the page path differs from the focus) — but hovering that marker directly
// still rings it. The detail-page map clip is unaffected: it keys off the focus
// coordinates, not this.
export const isMarkerOutlined = (
  key: string,
  hovered: Hovered,
  focused: string | null,
  pending: string | null,
  path: string,
): boolean => {
  // A hover on this marker decides directly: a direct marker hover (no `row`)
  // always rings; a row hover rings only its own entry's row — a /status visit
  // row (`row` ≠ marker key) does not.
  if (hovered !== null && key === hovered.marker) {
    return hovered.row === undefined || hovered.row === hovered.marker;
  }
  // No hover on this marker: the focused entry rings only on its own page
  // (path === focus). On /status/<id> the focus is the visited entry
  // (path ≠ focus), so at rest it stays dark.
  if (focused !== null && key === focused) return path === focused;
  // Nothing hovered: bridge the ring to the in-flight target — always an entry
  // page, since a /status/<id> target never matches a marker key.
  return hovered === null && key === pending;
};

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

  test("a marker rings only as an entry subject — a /status row hover and the /status/<id> page at rest suppress the ring, though a direct marker hover always rings; the home hover, the entry's own page, and the in-flight target keep it", () => {
    const entry = "/projects/foo";
    // Home catalog: a row hover (row === marker) and a direct marker hover ring it.
    expect(isMarkerOutlined(entry, { marker: entry, row: entry }, null, null, "/")).toBe(true);
    expect(isMarkerOutlined(entry, { marker: entry }, null, null, "/")).toBe(true);
    // /status row hover: the row href differs from the marker key → no ring.
    expect(
      isMarkerOutlined(entry, { marker: entry, row: "/status/a" }, null, null, "/status"),
    ).toBe(false);
    // The entry's own detail page rings it; a different marker stays dark.
    expect(isMarkerOutlined(entry, null, entry, null, entry)).toBe(true);
    expect(isMarkerOutlined("/projects/bar", { marker: entry }, null, null, "/")).toBe(false);
    // /status/<id>: focus is the visited entry (path !== focus), so at rest it
    // stays dark — but hovering that marker directly still rings it.
    expect(isMarkerOutlined(entry, null, entry, null, "/status/a")).toBe(false);
    expect(isMarkerOutlined(entry, { marker: entry }, entry, null, "/status/a")).toBe(true);
    // Nothing hovered: the in-flight navigation target keeps its ring.
    expect(isMarkerOutlined(entry, null, null, entry, "/")).toBe(true);
  });
}
