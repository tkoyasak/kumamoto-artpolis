import { getCollection } from "astro:content";

import { type ActiveEntry, isActive } from "./catalog.ts";
import { type CatalogCollection, type Category, categoryOf, entryHref } from "./routes.ts";
import { getVisitsByEntry } from "./visits.ts";

// One row per catalog entry; `href` links the table row to its map marker.
export type EntryRow = {
  href: string;
  category: Category;
  number: number;
  name: string;
  architects: string[];
  use: string;
  municipality: string;
  completedYear: number | null;
};

// Unordered: row order and grouping are owned by the table island
// (SortableTable's `initialSorting`/`groups`), which sorts the same on the server.
export async function getEntryRows(): Promise<EntryRow[]> {
  const projects = await getCollection("projects");
  const kap92 = await getCollection("kap92");
  return [...projects, ...kap92].filter(isActive).map((entry) => toEntryRow(entry));
}

export async function entryStaticPaths(collection: CatalogCollection) {
  const entries = await getCollection(collection);
  const visits = await getVisitsByEntry();
  return entries.filter(isActive).map((entry) => ({
    params: { id: entry.id },
    props: { entry, visits: visits.get(entryHref(entry)) ?? [] },
  }));
}

// Base's `mapFocus` prop: coordinates plus the marker key, which on
// /status/<id> differs from the page path.
export function entryMapFocus(entry: ActiveEntry) {
  return { lat: entry.data.lat, lng: entry.data.lng, href: entryHref(entry) };
}

export function toEntryRow(entry: ActiveEntry): EntryRow {
  return {
    href: entryHref(entry),
    category: categoryOf(entry.collection),
    number: entry.data.number,
    name: entry.data.name,
    architects: entry.data.architects,
    use: entry.data.use,
    municipality: entry.data.municipality,
    completedYear: entry.data.completedYear ?? null,
  };
}
