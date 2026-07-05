import type { Category } from "./routes.ts";

// Presentation module for the fixed-layout tables (client-safe, shared with the
// Preact island): DetailTable's row shape, the outline class per category, and
// the pinned column widths.

export type DetailCell = {
  text: string;
  // Render as the row's name link (the "name" column of each table).
  strong?: boolean;
};

// Presentation-only row shape for DetailTable, the static fixed-layout table
// shared by the entry detail pages (EntryDetailTable) and the visit timeline
// (StatusTable). Each caller maps its own domain row (EntryRow, StatusRow)
// into this shape; DetailTable knows nothing about the collections beyond the
// outline `category`.
export type DetailRow = {
  // Navigation target and the key paired across the View Transition swap: the
  // clicked row and its counterpart on the other page share this href (the
  // row's transition name is derived from it, see rowTransitionName).
  href: string;
  // Picks the outline color (project = red, kap92 = blue), mirroring the map marker.
  category: Category;
  cells: DetailCell[];
};

// Row outline in the collection color (--color-project / --color-kap92 in
// global.css), shared by the home island and DetailTable.
export const outlineClass = (category: Category): string =>
  category === "kap92" ? "outline-kap92" : "outline-project";

// A table's total width = the sum of its fixed columns, as a definite `rem` width.
// Shared by every fixed-layout table (entry + status): see the note on
// ENTRY_TABLE_WIDTH for why the width must be definite rather than max-content.
export const tableWidth = (widths: readonly string[]): string =>
  `${widths.reduce((sum, w) => sum + Number.parseFloat(w), 0)}rem`;

// Fixed column widths shared by both entry tables, applied via a <colgroup>
// under `table-layout: fixed`. The home table sizes columns from many rows, the
// detail table from a single one, so their natural widths differ — pinning
// identical fixed widths stops the header/row from jittering as they morph across
// the swap. Cells truncate (…) past their width; when the whole table is wider
// than the viewport it scrolls horizontally (overflow-x on the wrapper).
// Order: No., Name, Architects, Use, Location, Year. Name is the widest;
// Architects narrower; Use/Location share one width.
export const ENTRY_COL_WIDTHS = ["4rem", "20rem", "8rem", "8rem", "8rem", "6rem"] as const;

// The table's total width = sum of the fixed columns. It MUST be a definite width:
// with `width: max-content` (Tailwind w-max) `table-layout: fixed` stops enforcing
// the colgroup widths and columns grow to fit content (no truncation). A definite
// width keeps columns pinned, so overflow truncates (…) and the wrapper scrolls.
export const ENTRY_TABLE_WIDTH = tableWidth(ENTRY_COL_WIDTHS);

// Fixed column widths for the StatusTable (Date, Name), same fixed-layout trick
// as the entry tables so the header and row don't jitter as they morph.
export const STATUS_COL_WIDTHS = ["8rem", "20rem"] as const;
