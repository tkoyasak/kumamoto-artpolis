import type { EntryRow } from "./entries.ts";
import type { Category } from "./routes.ts";
import type { StatusRow } from "./status.ts";
// (type-only: entries.ts/status.ts import astro:content at runtime, which
// must never be pulled into this client-safe module)

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
// they morph. Order matches ENTRY_HEADERS below.
export const ENTRY_COL_WIDTHS = ["5rem", "20rem", "8rem", "8rem", "8rem", "6rem"] as const;

// Order matches STATUS_HEADERS below.
export const STATUS_COL_WIDTHS = ["8rem", "20rem"] as const;

// Below-sm column overrides, aligned with *_COL_WIDTHS: a `max-sm` width class
// (`!` beats the inline desktop width) or null to hide the column. Applied to
// list and detail tables alike, so the morph pairs keep identical shapes.
export const ENTRY_MOBILE_COLS = [
  "max-sm:w-16!",
  "max-sm:w-auto!",
  null,
  null,
  null,
  "max-sm:w-14!",
] as const;

export const STATUS_MOBILE_COLS = ["max-sm:w-24!", "max-sm:w-auto!"] as const;

// Header labels, insertion order = column order = *_COL_WIDTHS order.
export const ENTRY_HEADERS = {
  number: "No.",
  name: "Name",
  architects: "Architects",
  use: "Use",
  municipality: "Location",
  completedYear: "Year",
} as const;

export const STATUS_HEADERS = {
  date: "Date",
  name: "Name",
} as const;

// The static detail tables' cells, matching the islands' rendering.
export const entryDetailCells = (row: EntryRow): DetailCell[] => [
  { text: String(row.number) },
  { text: row.name, link: true },
  { text: row.architects.join(", ") },
  { text: row.use },
  { text: row.municipality },
  { text: row.completedYear != null ? String(row.completedYear) : "" },
];

export const statusDetailCells = (row: StatusRow): DetailCell[] => [
  { text: row.date },
  { text: row.name, link: true },
];

if (import.meta.vitest) {
  const { expect, test } = import.meta.vitest;

  test("tableWidth sums the fixed columns into a definite rem width: table-layout fixed only truncates under a definite width", () => {
    expect(tableWidth(["4rem", "20rem"])).toBe("24rem");
  });

  test("the row outline follows the collection, mirroring the map marker colors", () => {
    expect(outlineClass("project")).toBe("outline-project");
    expect(outlineClass("kap92")).toBe("outline-kap92");
  });

  test("every entry header has a column width: a new column must update both or the fixed layout breaks", () => {
    expect(Object.values(ENTRY_HEADERS).length).toBe(ENTRY_COL_WIDTHS.length);
  });

  test("every status header has a column width: a new column must update both or the fixed layout breaks", () => {
    expect(Object.values(STATUS_HEADERS).length).toBe(STATUS_COL_WIDTHS.length);
  });

  test("every column has a mobile override slot: misaligned arrays shift cells into the wrong columns", () => {
    expect(ENTRY_MOBILE_COLS.length).toBe(ENTRY_COL_WIDTHS.length);
    expect(STATUS_MOBILE_COLS.length).toBe(STATUS_COL_WIDTHS.length);
  });

  test("the name column survives on mobile: it carries the row link and the morph pairing", () => {
    expect(ENTRY_MOBILE_COLS[1]).not.toBeNull();
    expect(STATUS_MOBILE_COLS[1]).not.toBeNull();
  });

  const minimalEntryRow: EntryRow = {
    href: "/projects/foo",
    category: "project",
    number: 1,
    name: "Foo",
    architects: ["Bar"],
    use: "Museum",
    municipality: "Kumamoto",
    completedYear: 2000,
  };

  const minimalStatusRow: StatusRow = {
    id: "2020-01-01T00:00",
    date: "2020-01-01",
    href: "/status/2020-01-01T00:00",
    name: "Foo",
    category: "project",
    entryHref: "/projects/foo",
  };

  test("entryDetailCells line up 1:1 under the headers, with the name cell as the row link", () => {
    const cells = entryDetailCells(minimalEntryRow);
    expect(cells.length).toBe(Object.values(ENTRY_HEADERS).length);
    expect(cells[1]?.link).toBe(true);
  });

  test("statusDetailCells line up 1:1 under the headers, with the name cell as the row link", () => {
    const cells = statusDetailCells(minimalStatusRow);
    expect(cells.length).toBe(Object.values(STATUS_HEADERS).length);
    expect(cells[1]?.link).toBe(true);
  });
}
