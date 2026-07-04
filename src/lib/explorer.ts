import { getCollection } from "astro:content";
import type { CollectionEntry } from "astro:content";

import type { MapProject } from "./map.ts";
import { getVisitsByEntry } from "./visits.ts";

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
  visitedDate: string | null; // latest visit date, or null if never visited
  lat: number;
  lng: number;
};

// Load and merge both collections into the sorted explorer rows. Projects sort
// before KAP'92, then by official number. Used by the home table and the map layer.
export async function getExplorerRows(): Promise<ExplorerRow[]> {
  const projects = await getCollection("projects");
  const kap92 = await getCollection("kap92");
  const visits = await getVisitsByEntry();

  const rows = [...projects, ...kap92].map((entry) => {
    // Visits are status ids (ISO datetimes), newest first; the row wants the
    // latest visit *date*, so take the first and drop its time part.
    const latest = (visits.get(`/${entry.collection}/${entry.id}`) ?? [])[0];
    return toExplorerRow(entry, latest ? latest.slice(0, 10) : null);
  });

  return rows.sort((a, b) => {
    if (a.category !== b.category) return a.category === "project" ? -1 : 1;
    return a.number - b.number;
  });
}

// Derive the map markers from explorer rows: one marker per entry (the shared
// schema makes coordinates required, so every row has them).
export function toMapProjects(rows: ExplorerRow[]): MapProject[] {
  return rows.map((row) => ({
    href: row.href,
    name: row.name,
    category: row.category,
    completedYear: row.completedYear,
    visited: row.visitedDate != null,
    lat: row.lat,
    lng: row.lng,
  }));
}

// Build an explorer row from a catalog entry. Projects and KAP'92 buildings share
// one schema, so one builder covers both: `href`/`category` follow the collection
// name, and either collection may pass a `visitedDate` (both can be visited).
export function toExplorerRow(
  entry: CollectionEntry<"projects"> | CollectionEntry<"kap92">,
  visitedDate: string | null = null,
): ExplorerRow {
  return {
    href: `/${entry.collection}/${entry.id}`,
    category: entry.collection === "projects" ? "project" : "kap92",
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
