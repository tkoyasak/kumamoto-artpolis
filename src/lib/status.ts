import { getCollection } from "astro:content";
import type { CollectionEntry } from "astro:content";

import { type Category, categoryOf, statusDate, statusHref } from "./routes.ts";
import { getVisitedEntry } from "./visits.ts";

// Row for the visit timeline (StatusTable); `id` keys both the /status/<id>
// link and the View Transition morph.
export type StatusRow = {
  id: string;
  date: string;
  href: string;
  name: string;
  category: Category;
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
  };
}

export async function getStatusRows(): Promise<StatusRow[]> {
  const status = await getCollection("status");
  const rows = await Promise.all(
    status.map(async (visit) => toStatusRow(visit.id, await getVisitedEntry(visit))),
  );
  return rows.sort((a, b) => b.id.localeCompare(a.id));
}
