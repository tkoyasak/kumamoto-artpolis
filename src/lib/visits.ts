import { getCollection, getEntry } from "astro:content";
import type { CollectionEntry } from "astro:content";

import { entryHref } from "./routes.ts";

// A status record's single entry reference — `project` or `kap92` (the schema's
// refine guarantees exactly one is set). Throws if a record somehow carries
// neither, so a broken record fails the build instead of being silently
// dropped; both consumers below share this policy.
function visitedRef(visit: CollectionEntry<"status">) {
  const ref = visit.data.project ?? visit.data.kap92;
  if (!ref) throw new Error(`status ${visit.id}: no entry reference`);
  return ref;
}

/**
 * Resolve a status record's single visited entry. Throws if the reference
 * doesn't resolve (a typo'd or deleted id), so a broken reference fails the
 * build.
 */
export async function getVisitedEntry(
  visit: CollectionEntry<"status">,
): Promise<CollectionEntry<"projects"> | CollectionEntry<"kap92">> {
  const ref = visitedRef(visit);
  const entry = await getEntry(ref);
  if (!entry)
    throw new Error(`status ${visit.id}: references missing entry ${ref.collection}/${ref.id}`);
  return entry;
}

/**
 * Visit records per entry, newest first, derived from the status collection (the
 * source of truth for who was visited when). Covers both catalog collections:
 * keyed by the entry href (`/projects/<id>` or `/kap92/<id>`). Each value is
 * the list of status ids (ISO datetimes) visiting that entry — the id doubles as
 * the `/status/<id>` link and, via `statusDate`, the visit date. Entries with
 * no visits are absent.
 */
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
