import type { CollectionEntry } from "astro:content";

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

// Build the explorer row for a project entry. `visitedDate` is its latest visit.
export function toProjectRow(
  entry: CollectionEntry<"projects">,
  visitedDate: string | null,
): ExplorerRow {
  return {
    href: `/projects/${entry.data.slug}`,
    category: "project",
    number: entry.data.number,
    name: entry.data.name,
    architects: entry.data.architects,
    use: entry.data.use,
    municipality: entry.data.municipality,
    completedYear: entry.data.completedYear,
    visitedDate,
    lat: entry.data.lat,
    lng: entry.data.lng,
  };
}

// Build the explorer row for a KAP'92 entry. Most fields are optional there.
export function toKap92Row(entry: CollectionEntry<"kap92">): ExplorerRow {
  return {
    href: `/kap92/${entry.data.slug}`,
    category: "kap92",
    number: entry.data.number,
    name: entry.data.name,
    architects: entry.data.architects ?? [],
    use: entry.data.use ?? "",
    municipality: entry.data.municipality ?? "",
    completedYear: entry.data.completedYear ?? null,
    visitedDate: null,
    lat: entry.data.lat ?? null,
    lng: entry.data.lng ?? null,
  };
}
