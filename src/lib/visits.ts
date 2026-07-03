import { getCollection, getEntries } from "astro:content";
import type { CollectionEntry } from "astro:content";

/**
 * Resolve a status day's `projects` and `kap92` references into catalog entries,
 * ordered projects-first then by official number — the shared ordering the
 * status timeline and each day's record both render.
 */
export async function getVisitedEntries(
  day: CollectionEntry<"status">,
): Promise<(CollectionEntry<"projects"> | CollectionEntry<"kap92">)[]> {
  const entries = [...(await getEntries(day.data.projects)), ...(await getEntries(day.data.kap92))];
  return entries.sort((a, b) => {
    if (a.collection !== b.collection) return a.collection === "projects" ? -1 : 1;
    return a.data.number - b.data.number;
  });
}

/**
 * Visit dates per entry, newest first, derived from the status collection (the
 * source of truth for who was visited when). Covers both catalog collections:
 * keyed by the entry href (`/projects/<slug>` or `/kap92/<slug>`) so projects
 * and KAP'92 buildings never collide on a shared slug. Entries with no visits
 * are absent.
 */
export async function getVisitDatesByEntry(): Promise<Map<string, string[]>> {
  const status = await getCollection("status");
  const byEntry = new Map<string, string[]>();

  for (const day of status) {
    for (const ref of [...day.data.projects, ...day.data.kap92]) {
      const href = `/${ref.collection}/${ref.id}`;
      const dates = byEntry.get(href) ?? [];
      dates.push(day.id);
      byEntry.set(href, dates);
    }
  }

  for (const dates of byEntry.values()) {
    dates.sort((a, b) => b.localeCompare(a));
  }
  return byEntry;
}
