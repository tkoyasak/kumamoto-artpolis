import { getCollection } from "astro:content";
import type { CollectionEntry } from "astro:content";

import { type Category, categoryOf, statusDate, statusHref } from "./routes.ts";
import { getVisitedEntry } from "./visits.ts";

// Row shape for the visit timeline table (StatusTable), shared by /status (all
// rows) and /status/<id> (one row). One row per status record. `id` is the ISO
// datetime (the entry id) that keys both the `/status/<id>` link and the View
// Transition morph; `category` picks the row's outline color.
export type StatusRow = {
  id: string;
  date: string; // YYYY-MM-DD, derived from the id
  href: string; // /status/<id>
  name: string;
  category: Category;
};

// Build a timeline row from a status id and the resolved visited entry. Takes
// the bare id (not the status record) so callers that only have visit ids —
// the entry detail pages get them from getVisitsByEntry() — can build rows too.
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

// All timeline rows, newest first. The id is an ISO datetime, so a descending
// string sort orders records across days and within a day in one key.
export async function getStatusRows(): Promise<StatusRow[]> {
  const status = await getCollection("status");
  const rows = await Promise.all(
    status.map(async (visit) => toStatusRow(visit.id, await getVisitedEntry(visit))),
  );
  return rows.sort((a, b) => b.id.localeCompare(a.id));
}
