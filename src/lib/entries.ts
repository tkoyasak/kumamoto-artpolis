import { getCollection } from "astro:content";
import type { CollectionEntry } from "astro:content";

import { type CatalogCollection, type Category, categoryOf, entryHref } from "./routes.ts";
import { getVisitsByEntry } from "./visits.ts";

// Row shape for the entry tables — the home island (EntriesTable.tsx) and its
// static detail-page counterpart (EntryDetailTable.astro). One row per project
// or KAP'92 building, holding exactly the displayed columns; `href` is the
// unique key linking a table row to its map marker.
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

// Load and merge both collections into the sorted entry rows for the home
// table. Projects sort before KAP'92, then by official number.
export async function getEntryRows(): Promise<EntryRow[]> {
  const projects = await getCollection("projects");
  const kap92 = await getCollection("kap92");

  const rows = [...projects, ...kap92].map((entry) => toEntryRow(entry));
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

// Base's `mapFocus` prop for a page focused on this entry: its coordinates and
// its href — the marker key, which on /status/<id> differs from the page path.
export function entryMapFocus(entry: CollectionEntry<"projects"> | CollectionEntry<"kap92">) {
  return { lat: entry.data.lat, lng: entry.data.lng, href: entryHref(entry) };
}

// Build a table row from a catalog entry. Projects and KAP'92 buildings share
// one schema, so one builder covers both: `href`/`category` follow the
// collection name.
export function toEntryRow(
  entry: CollectionEntry<"projects"> | CollectionEntry<"kap92">,
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
  };
}
