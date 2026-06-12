import { getCollection } from "astro:content";

/**
 * Visit dates per project, newest first, derived from the status collection
 * (the source of truth for who was visited when). Keyed by project entry id
 * (the slug, e.g. "hozukubo-daiichi-danchi"). Projects with no visits are absent.
 */
export async function getVisitDatesByProject(): Promise<Map<string, string[]>> {
  const status = await getCollection("status");
  const byProject = new Map<string, string[]>();

  for (const day of status) {
    for (const ref of day.data.projects) {
      const dates = byProject.get(ref.id) ?? [];
      dates.push(day.id);
      byProject.set(ref.id, dates);
    }
  }

  for (const dates of byProject.values()) {
    dates.sort((a, b) => b.localeCompare(a));
  }
  return byProject;
}
