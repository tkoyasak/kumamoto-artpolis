import { atom } from "nanostores";

// Hover state shared across the islands (bundled once, so all read one atom).
// `marker` is the hovered entry's marker key (an href); `row` the hovering
// row's own href, absent when the marker itself is hovered. The row↔marker
// linkage and the ring's subjecthood rule are in docs/adr/0010, pinned below.
export type Hovered = {
  marker: string;
  row?: string;
} | null;

export const $hovered = atom<Hovered>(null);

export const isRowHighlighted = (hovered: Hovered, rowHref: string, markerHref: string): boolean =>
  hovered !== null &&
  (hovered.row !== undefined ? hovered.row === rowHref : hovered.marker === markerHref);

// Whether a marker draws its subjecthood ring — the (hover source × page
// context) matrix of docs/adr/0010, pinned branch by branch below.
export const isMarkerOutlined = (
  key: string,
  hovered: Hovered,
  focused: string | null,
  pending: string | null,
  path: string,
): boolean => {
  if (hovered !== null && key === hovered.marker) {
    return hovered.row === undefined || hovered.row === hovered.marker;
  }
  if (focused !== null && key === focused) return path === focused;
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
