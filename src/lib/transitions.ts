// View Transition names shared between the interactive home table
// (ProjectsTable.tsx) and the static detail-page table (ExplorerTable.astro), so
// navigating index -> detail morphs the clicked row and the header into place.
// Kept in its own module (no astro:content imports) so it is safe to import from
// the Preact client island.

// The table header row: same name on both tables, so it stays put across the swap.
export const EXPLORER_HEAD_VT = "explorer-head";

// The persisted map layer. Doubles as its DOM id and its `transition:persist` name
// (Base.astro), and the id the map island toggles visibility on (ProjectsMap.astro).
// Pinning an explicit persist name keeps it stable across pages — Astro's
// auto-generated persist ids are position-dependent and were colliding.
export const MAP_LAYER_ID = "map-layer";

// A stable name for one row, keyed by its href. On the home table this is applied
// only to the row being clicked (all rows sharing a name would each become their
// own transition group); the detail page applies it to its single row.
export function rowTransitionName(href: string): string {
  return `entry${href.replace(/[^a-zA-Z0-9]+/g, "-")}`;
}

// Fixed column widths shared by both explorer tables, applied via a <colgroup>
// under `table-layout: fixed`. The home table sizes columns from many rows, the
// detail table from a single one, so their natural widths differ — pinning
// identical fixed widths stops the header/row from jittering as they morph across
// the swap. Cells truncate (…) past their width; when the whole table is wider
// than the viewport it scrolls horizontally (overflow-x on the wrapper).
// Order: No., Name, Architects, Use, Location, Year, Visited. Name is the widest;
// Architects narrower; Use/Location/Year/Visited share one width.
export const EXPLORER_COL_WIDTHS = [
  "4rem",
  "20rem",
  "8rem",
  "8rem",
  "8rem",
  "6rem",
  "6rem",
] as const;

// The table's total width = sum of the fixed columns. It MUST be a definite width:
// with `width: max-content` (Tailwind w-max) `table-layout: fixed` stops enforcing
// the colgroup widths and columns grow to fit content (no truncation). A definite
// width keeps columns pinned, so overflow truncates (…) and the wrapper scrolls.
export const EXPLORER_TABLE_WIDTH = `${EXPLORER_COL_WIDTHS.reduce(
  (sum, w) => sum + Number.parseFloat(w),
  0,
)}rem`;
