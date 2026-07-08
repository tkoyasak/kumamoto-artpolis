import { readdirSync, readFileSync } from "node:fs";

import { expect, type Page } from "@playwright/test";

// The filename is the entry/visit id (ADR 0002/0003), so the expected set of
// rows and markers can be derived from the content files — these tests stay
// in sync as content grows.
export function contentIds(collection: "projects" | "kap92" | "status"): string[] {
  return readdirSync(new URL(`../src/content/${collection}/`, import.meta.url))
    .filter((file) => file.endsWith(".md"))
    .map((file) => file.slice(0, -".md".length));
}

// A visit's frontmatter references exactly one entry via `project` XOR `kap92`
// (ADR 0003); resolve that entry's href — the map marker key — from the file.
export function visitedEntryHref(statusId: string): string {
  const text = readFileSync(
    new URL(`../src/content/status/${statusId}.md`, import.meta.url),
    "utf8",
  );
  const match = text.match(/^(project|kap92): *(\S+)/m);
  if (!match) throw new Error(`no entry reference in status/${statusId}.md`);
  return match[1] === "project" ? `/projects/${match[2]}` : `/kap92/${match[2]}`;
}

export function firstOf<T>(items: T[]): T {
  const first = items[0];
  if (first === undefined) throw new Error("expected at least one item");
  return first;
}

// Astro strips the `ssr` attribute from an island once it hydrates; the
// table island's event handlers (row clicks, sorting) only exist after that.
export async function hydrated(page: Page): Promise<void> {
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
}

// The map style comes from an external CDN; answer with an empty style so the
// tests are hermetic. Markers are DOM overlays, so they need no real tiles.
export async function routeMapStyle(page: Page): Promise<void> {
  await page.route("https://basemaps.cartocdn.com/**", (route) =>
    route.fulfill({ json: { version: 8, sources: {}, layers: [] } }),
  );
}
