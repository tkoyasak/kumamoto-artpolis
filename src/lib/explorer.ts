// Shared row shape for the home explorer (table + map). One row per project or
// KAP'92 building. `href` is the unique key linking a table row to its marker.
export type ExplorerRow = {
  href: string;
  category: "project" | "kap92";
  number: number;
  name: string;
  architects: string[];
  use: string;
  municipality: string;
  completedYear: number | null;
  visitedDate: string | null; // latest visit date (projects only)
  lat: number | null;
  lng: number | null;
};
