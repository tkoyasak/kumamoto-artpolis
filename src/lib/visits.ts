import { getCollection, getEntry } from "astro:content";
import type { CollectionEntry } from "astro:content";

import { entryHref } from "./routes.ts";

// The schema's refine guarantees exactly one ref is set; throwing on neither
// makes a broken record fail the build instead of being silently dropped.
function visitedRef(visit: CollectionEntry<"status">) {
  const ref = visit.data.project ?? visit.data.kap92;
  if (!ref) throw new Error(`status ${visit.id}: no entry reference`);
  return ref;
}

// Throws on a dangling reference (typo'd or deleted id) so it fails the build.
export async function getVisitedEntry(
  visit: CollectionEntry<"status">,
): Promise<CollectionEntry<"projects"> | CollectionEntry<"kap92">> {
  const ref = visitedRef(visit);
  const entry = await getEntry(ref);
  if (!entry)
    throw new Error(`status ${visit.id}: references missing entry ${ref.collection}/${ref.id}`);
  return entry;
}

// Visit ids per entry, newest first, keyed by entry href (ADR 0003). Entries
// with no visits are absent.
export async function getVisitsByEntry(): Promise<Map<string, string[]>> {
  const status = await getCollection("status");
  const byEntry = new Map<string, string[]>();

  for (const visit of status) {
    const href = entryHref(visitedRef(visit));
    const ids = byEntry.get(href) ?? [];
    ids.push(visit.id);
    byEntry.set(href, ids);
  }

  for (const ids of byEntry.values()) {
    ids.sort((a, b) => b.localeCompare(a));
  }
  return byEntry;
}
