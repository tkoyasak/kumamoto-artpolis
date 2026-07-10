import type { Category } from "./routes.ts";

// Presentation types/helpers for the fixed-layout tables (client-safe).

export type DetailCell = {
  text: string;
  // Render as the row's name link (an <a> carrying the row's target).
  link?: boolean;
};

export type DetailRow = {
  // Navigation target + View Transition pairing key.
  href: string;
  category: Category;
  cells: DetailCell[];
  // Marker key when it differs from `href`: a status row highlights its
  // *visited entry's* marker, not /status/<id>.
  markerHref?: string;
};

// Colors live in global.css; the shared markup contract is TableView.tsx.
export const outlineClass = (category: Category): string =>
  category === "kap92" ? "outline-kap92" : "outline-project";

export const tableWidth = (widths: readonly string[]): string =>
  `${widths.reduce((sum, w) => sum + Number.parseFloat(w), 0)}rem`;

// Identical widths on both entry tables so the header/rows don't jitter as
// they morph. Order: No., Name, Architects, Use, Location, Year.
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
