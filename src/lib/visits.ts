import { getCollection, getEntry } from "astro:content";
import type { CollectionEntry } from "astro:content";

/**
 * Resolve a status record's single visited entry — its `project` or `kap92`
 * reference (the schema's refine guarantees exactly one is set). Throws if a
 * record somehow carries neither, or if the reference doesn't resolve (a typo'd
 * or deleted id), so a broken reference fails the build.
 */
export async function getVisitedEntry(
  day: CollectionEntry<"status">,
): Promise<CollectionEntry<"projects"> | CollectionEntry<"kap92">> {
  const ref = day.data.project ?? day.data.kap92;
  if (!ref) throw new Error(`status ${day.id}: no entry reference`);
  const entry = await getEntry(ref);
  if (!entry)
    throw new Error(`status ${day.id}: references missing entry ${ref.collection}/${ref.id}`);
  return entry;
}

/**
 * Visit records per entry, newest first, derived from the status collection (the
 * source of truth for who was visited when). Covers both catalog collections:
 * keyed by the entry href (`/projects/<id>` or `/kap92/<id>`). Each value is
 * the list of status ids (ISO datetimes) visiting that entry — the id doubles as
 * the `/status/<id>` link and, via `id.slice(0, 10)`, the visit date. Entries
 * with no visits are absent.
 */
export async function getVisitsByEntry(): Promise<Map<string, string[]>> {
  const status = await getCollection("status");
  const byEntry = new Map<string, string[]>();

  for (const day of status) {
    const ref = day.data.project ?? day.data.kap92;
    if (!ref) continue;
    const href = `/${ref.collection}/${ref.id}`;
    const ids = byEntry.get(href) ?? [];
    ids.push(day.id);
    byEntry.set(href, ids);
  }

  for (const ids of byEntry.values()) {
    ids.sort((a, b) => b.localeCompare(a));
  }
  return byEntry;
}
