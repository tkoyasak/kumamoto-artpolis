import { expect, test } from "vitest";

import { kap92 } from "../src/data/kap92.ts";
import { excluded, projects } from "../src/data/projects.ts";

// Kumamoto Prefecture's bounding box, with a small margin.
const LAT = { min: 32.0, max: 33.3 };
const LNG = { min: 129.9, max: 131.4 };

const catalogs = { projects, kap92 };

test("an id is unique within its collection — Astro's array loader stores entries by id, so a duplicate would silently overwrite one and drop it from the site", () => {
  for (const [name, entries] of Object.entries(catalogs)) {
    const ids = entries.map((e) => e.id);
    expect(new Set(ids).size, name).toBe(ids.length);
  }
});

test("an id is lowercase, digits and dashes — it is the URL, and the schema can't police the shape of a field it strips", () => {
  for (const [name, entries] of Object.entries(catalogs)) {
    for (const entry of entries) {
      expect(entry.id, `${name}/${entry.name}`).toMatch(/^[a-z0-9][a-z0-9-]*$/);
    }
  }
});

test("every catalog coordinate falls inside Kumamoto Prefecture's bounding box — a swapped pair passes the schema (both in range as lng), and a mis-geocoded address would silently put the marker off the map", () => {
  for (const [name, entries] of Object.entries(catalogs)) {
    for (const entry of entries) {
      expect(entry.lat, `${name}/${entry.id} lat`).toBeGreaterThanOrEqual(LAT.min);
      expect(entry.lat, `${name}/${entry.id} lat`).toBeLessThanOrEqual(LAT.max);
      expect(entry.lng, `${name}/${entry.id} lng`).toBeGreaterThanOrEqual(LNG.min);
      expect(entry.lng, `${name}/${entry.id} lng`).toBeLessThanOrEqual(LNG.max);
    }
  }
});

test("no official number is both catalogued and excluded — the excluded rows exist to account for the numbers the entries don't", () => {
  const catalogued = new Set(projects.map((e) => e.number));
  for (const row of excluded) {
    expect(catalogued.has(row.number), `#${row.number} ${row.name}`).toBe(false);
  }
});
