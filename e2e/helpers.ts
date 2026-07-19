import { readdirSync, readFileSync } from "node:fs";

import { expect, type Page } from "@playwright/test";

import { type CatalogCollection, entryHref } from "../src/lib/routes.ts";

// The glob loader keys each entry by its filename, so a collection's ids are
// its directory's *.md filenames (the _excluded subdir isn't one of them).
export function contentIds(collection: "projects" | "kap92" | "status"): string[] {
  return readdirSync(new URL(`../src/content/${collection}/`, import.meta.url))
    .filter((file) => file.endsWith(".md"))
    .map((file) => file.slice(0, -".md".length));
}

export function visitedEntryHref(statusId: string): string {
  const text = readFileSync(
    new URL(`../src/content/status/${statusId}.md`, import.meta.url),
    "utf8",
  );
  const frontmatter = text.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
  const collection = frontmatter.match(/^ +collection: *(\S+)/m)?.[1];
  const id = frontmatter.match(/^ +id: *(\S+)/m)?.[1];
  if (!isCatalogCollection(collection) || !id)
    throw new Error(`no entry reference in status/${statusId}.md`);
  return entryHref({ collection, id });
}

function isCatalogCollection(value: string | undefined): value is CatalogCollection {
  return value === "projects" || value === "kap92";
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

// The table island overlays the map, and entries geocoded to the same 大字
// share a centroid and stack — so ask the page which marker would actually
// receive a pointer at its center, and target that one.
export async function pointableMarkerHref(page: Page): Promise<string> {
  const href = await page.evaluate(() => {
    for (const el of document.querySelectorAll<HTMLElement>(".map-marker")) {
      const r = el.getBoundingClientRect();
      const cx = r.x + r.width / 2;
      const cy = r.y + r.height / 2;
      if (cx < 0 || cy < 0 || cx > window.innerWidth || cy > window.innerHeight) continue;
      const hit = document.elementFromPoint(cx, cy);
      if (hit && (hit === el || el.contains(hit))) return el.dataset.href ?? null;
    }
    return null;
  });
  if (!href) throw new Error("no marker receives a pointer at its center");
  return href;
}
