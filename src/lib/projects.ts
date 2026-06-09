import type { CollectionEntry } from "astro:content";

type ProjectData = CollectionEntry<"projects">["data"];

/** Whether the project has been visited at least once. */
export function isVisited(project: ProjectData): boolean {
  return project.visitedDates.length > 0;
}

/** The most recent visit date ("YYYY-MM-DD"), or null if never visited. */
export function latestVisitedDate(project: ProjectData): string | null {
  if (project.visitedDates.length === 0) return null;
  return project.visitedDates.reduce((a, b) => (a > b ? a : b));
}
