import type { Category } from "./routes.ts";

// Presentation module for the fixed-layout tables (client-safe, shared with
// the Preact island).

export type DetailCell = {
  text: string;
  // Render as the row's name link.
  strong?: boolean;
};

export type DetailRow = {
  // Navigation target and the View Transition pairing key: the clicked row
  // and its counterpart on the other page share this href.
  href: string;
  category: Category;
  cells: DetailCell[];
};

// Colors live in global.css (--color-project / --color-kap92).
export const outlineClass = (category: Category): string =>
  category === "kap92" ? "outline-kap92" : "outline-project";

// Sum of the fixed columns as a definite width. It must stay definite: with
// `width: max-content`, `table-layout: fixed` stops enforcing the colgroup
// widths and columns grow instead of truncating.
export const tableWidth = (widths: readonly string[]): string =>
  `${widths.reduce((sum, w) => sum + Number.parseFloat(w), 0)}rem`;

// Identical pinned widths on both entry tables (many-row home, one-row detail)
// stop the header/row jittering as they morph across the swap.
// Order: No., Name, Architects, Use, Location, Year.
export const ENTRY_COL_WIDTHS = ["4rem", "20rem", "8rem", "8rem", "8rem", "6rem"] as const;

export const ENTRY_TABLE_WIDTH = tableWidth(ENTRY_COL_WIDTHS);

// Order: Date, Name.
export const STATUS_COL_WIDTHS = ["8rem", "20rem"] as const;
