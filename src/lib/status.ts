import { getCollection } from "astro:content";
import type { CollectionEntry } from "astro:content";

import { type Category, categoryOf, entryHref, statusDate, statusHref } from "./routes.ts";
import { getVisitedEntry } from "./visits.ts";

// Row for the visit timeline (StatusTable); `id` keys both the /status/<id>
// link and the View Transition morph.
export type StatusRow = {
  id: string;
  date: string;
  href: string;
  name: string;
  category: Category;
  // The visited entry's href — the map marker key, so hovering a timeline row
  // can highlight that entry's marker.
  entryHref: string;
};

// Takes the bare id (not the status record) so callers holding only visit ids
// — the entry detail pages — can build rows too.
export function toStatusRow(
  id: string,
  entry: CollectionEntry<"projects"> | CollectionEntry<"kap92">,
): StatusRow {
  return {
    id,
    date: statusDate(id),
    href: statusHref(id),
    name: entry.data.name,
    category: categoryOf(entry.collection),
    entryHref: entryHref(entry),
  };
}

// Unordered: display order is owned by the table island (SortableTable's
// `initialSorting`), which sorts the same way on the server render.
export async function getStatusRows(): Promise<StatusRow[]> {
  const status = await getCollection("status");
  return Promise.all(
    status.map(async (visit) => toStatusRow(visit.id, await getVisitedEntry(visit))),
  );
}
