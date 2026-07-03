import { getCollection } from "astro:content";
import type { CollectionEntry } from "astro:content";

import type { MapProject } from "./map.ts";
import { getVisitDatesByProject } from "./projects.ts";

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

// Load and merge both collections into the sorted explorer rows. Projects sort
// before KAP'92, then by official number. Used by the home table and the map layer.
export async function getExplorerRows(): Promise<ExplorerRow[]> {
  const projects = await getCollection("projects");
  const kap92 = await getCollection("kap92");
  const visits = await getVisitDatesByProject();

  const projectRows = projects.map((project) =>
    toProjectRow(project, (visits.get(project.data.slug) ?? [])[0] ?? null),
  );
  const kap92Rows = kap92.map((building) => toKap92Row(building));

  return [...projectRows, ...kap92Rows].sort((a, b) => {
    if (a.category !== b.category) return a.category === "project" ? -1 : 1;
    return a.number - b.number;
  });
}

// Derive the map markers from explorer rows: only entries with coordinates.
export function toMapProjects(rows: ExplorerRow[]): MapProject[] {
  const mapProjects: MapProject[] = [];
  for (const row of rows) {
    if (row.lat == null || row.lng == null) continue;
    mapProjects.push({
      href: row.href,
      name: row.name,
      category: row.category,
      completedYear: row.completedYear,
      visited: row.visitedDate != null,
      lat: row.lat,
      lng: row.lng,
    });
  }
  return mapProjects;
}

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
    completedYear: entry.data.completedYear ?? null,
    visitedDate,
    lat: entry.data.lat,
    lng: entry.data.lng,
  };
}

// Build the explorer row for a KAP'92 entry. Shares projects' schema, so only
// `completedYear` can be absent; kap92 entries never carry visit dates.
export function toKap92Row(entry: CollectionEntry<"kap92">): ExplorerRow {
  return {
    href: `/kap92/${entry.data.slug}`,
    category: "kap92",
    number: entry.data.number,
    name: entry.data.name,
    architects: entry.data.architects,
    use: entry.data.use,
    municipality: entry.data.municipality,
    completedYear: entry.data.completedYear ?? null,
    visitedDate: null,
    lat: entry.data.lat,
    lng: entry.data.lng,
  };
}
