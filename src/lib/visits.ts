import { getCollection } from "astro:content";

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
