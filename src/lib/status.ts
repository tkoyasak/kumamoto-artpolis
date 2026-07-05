import { getCollection } from "astro:content";
import type { CollectionEntry } from "astro:content";

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
  category: "project" | "kap92";
};

// Build a timeline row from a status record: resolve its single visited entry,
// then derive the date from the id and the outline category from the entry's
// collection.
export async function toStatusRow(visit: CollectionEntry<"status">): Promise<StatusRow> {
  const entry = await getVisitedEntry(visit);
  return {
    id: visit.id,
    date: visit.id.slice(0, 10),
    href: `/status/${visit.id}`,
    name: entry.data.name,
    category: entry.collection === "projects" ? "project" : "kap92",
  };
}

// All timeline rows, newest first. The id is an ISO datetime, so a descending
// string sort orders records across days and within a day in one key.
export async function getStatusRows(): Promise<StatusRow[]> {
  const status = await getCollection("status");
  const rows = await Promise.all(status.map(toStatusRow));
  return rows.sort((a, b) => b.id.localeCompare(a.id));
}
