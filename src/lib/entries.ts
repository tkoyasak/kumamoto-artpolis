import { getCollection } from "astro:content";
import type { CollectionEntry } from "astro:content";

import type { MapEntry } from "./map.ts";
import {
  type CatalogCollection,
  type Category,
  categoryOf,
  entryHref,
  statusDate,
} from "./routes.ts";
import { getVisitsByEntry } from "./visits.ts";

// Shared row shape for the home page (table + map). One row per project or
// KAP'92 building. `href` is the unique key linking a table row to its marker.
export type EntryRow = {
  href: string;
  category: Category;
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

// Load and merge both collections into the sorted entry rows. Projects sort
// before KAP'92, then by official number. Used by the home table and the map layer.
export async function getEntryRows(): Promise<EntryRow[]> {
  const projects = await getCollection("projects");
  const kap92 = await getCollection("kap92");
  const visits = await getVisitsByEntry();

  const rows = [...projects, ...kap92].map((entry) => {
    // Visits are status ids (ISO datetimes), newest first; the row wants the
    // latest visit *date*, so take the first and drop its time part.
    const latest = (visits.get(entryHref(entry)) ?? [])[0];
    return toEntryRow(entry, latest ? statusDate(latest) : null);
  });

  return rows.sort((a, b) => {
    if (a.category !== b.category) return a.category === "project" ? -1 : 1;
    return a.number - b.number;
  });
}

// getStaticPaths body shared by /projects/[id] and /kap92/[id]: one page per
// entry, keyed by its id, with the entry's visit ids (newest first) as props.
export async function entryStaticPaths(collection: CatalogCollection) {
  const entries = await getCollection(collection);
  const visits = await getVisitsByEntry();
  return entries.map((entry) => ({
    params: { id: entry.id },
    props: { entry, visits: visits.get(entryHref(entry)) ?? [] },
  }));
}

// Derive the map markers from entry rows: one marker per entry (the shared
// schema makes coordinates required, so every row has them).
export function toMapEntries(rows: EntryRow[]): MapEntry[] {
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

// Build an entry row from a catalog entry. Projects and KAP'92 buildings share
// one schema, so one builder covers both: `href`/`category` follow the collection
// name, and either collection may pass a `visitedDate` (both can be visited).
export function toEntryRow(
  entry: CollectionEntry<"projects"> | CollectionEntry<"kap92">,
  visitedDate: string | null = null,
): EntryRow {
  return {
    href: entryHref(entry),
    category: categoryOf(entry.collection),
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
