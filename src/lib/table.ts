/// <reference types="vitest/importMeta" />

import type { Category } from "./routes.ts";

// Presentation module for the fixed-layout tables (client-safe, shared with
// the Preact island).

export type DetailCell = {
  text: string;
  // Render as the row's name link — an <a> carrying the row's target, so the
  // row works without the script (keyboard, screen readers, new tab).
  link?: boolean;
};

export type DetailRow = {
  // Navigation target and the View Transition pairing key: the clicked row
  // and its counterpart on the other page share this href.
  href: string;
  category: Category;
  cells: DetailCell[];
  // Map marker key ($hovered) when it differs from `href`: a status row
  // hover-highlights its *visited entry's* marker, not /status/<id>.
  markerHref?: string;
};

// Colors live in global.css (--color-project / --color-kap92).
export const outlineClass = (category: Category): string =>
  category === "kap92" ? "outline-kap92" : "outline-project";

// The island (SortableTable.tsx) and the static table (DetailTable.astro)
// must render identically for the row morph to pair cleanly
// (docs/issues/0003). These shared strings are that contract — change them
// here, never in one table alone.
export const TABLE_WRAP_CLASS = "overflow-x-auto px-4 py-4 sm:px-8";
export const TABLE_CLASS = "table-fixed border-collapse text-base";
export const HEAD_CELL_CLASS = "truncate py-1 pr-4 text-sm font-normal first:pl-4";
export const CELL_CLASS = "truncate py-1 pr-4 text-sm first:pl-4";

// `outlined` keeps the outline on (the detail page's subject row, a hovered
// row); off, it appears on CSS hover only.
export const rowClass = (category: Category, outlined: boolean): string =>
  `cursor-pointer -outline-offset-1 ${outlineClass(category)} ${
    outlined ? "outline" : "hover:outline"
  }`;

// Sum of the fixed columns as a definite width. It must stay definite: with
// `width: max-content`, `table-layout: fixed` stops enforcing the colgroup
// widths and columns grow instead of truncating.
export const tableWidth = (widths: readonly string[]): string =>
  `${widths.reduce((sum, w) => sum + Number.parseFloat(w), 0)}rem`;

// Identical pinned widths on both entry tables (many-row home, one-row detail)
// stop the header/row jittering as they morph across the swap.
// Order: No., Name, Architects, Use, Location, Year. No. fits its header
// text plus the sort-arrow slot; narrower and `truncate` ellipsizes "No.".
export const ENTRY_COL_WIDTHS = ["5rem", "20rem", "8rem", "8rem", "8rem", "6rem"] as const;

// Order: Date, Name.
export const STATUS_COL_WIDTHS = ["8rem", "20rem"] as const;

if (import.meta.vitest) {
  const { expect, test } = import.meta.vitest;

  test("tableWidth sums the fixed columns into a definite rem width: table-layout fixed only truncates under a definite width", () => {
    expect(tableWidth(["4rem", "20rem"])).toBe("24rem");
  });

  test("the row outline follows the collection, mirroring the map marker colors", () => {
    expect(outlineClass("project")).toBe("outline-project");
    expect(outlineClass("kap92")).toBe("outline-kap92");
  });
}
