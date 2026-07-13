import { readdirSync, readFileSync } from "node:fs";

import { expect, test } from "vitest";

// Kumamoto Prefecture's bounding box, with a small margin.
const LAT = { min: 32.0, max: 33.3 };
const LNG = { min: 129.9, max: 131.4 };

const entries = (dir: string) => {
  const base = new URL(`../src/content/${dir}/`, import.meta.url);
  return (
    readdirSync(base)
      .filter((name) => name.endsWith(".md"))
      .map((name) => ({ name, raw: readFileSync(new URL(name, base), "utf-8") }))
      // Excluded markers (ADR 0013) aren't buildings and carry no coordinates.
      .filter(({ raw }) => !/^excluded: true$/m.test(raw))
      .map(({ name, raw }) => {
        const num = (field: string) => Number(raw.match(new RegExp(`^${field}: (.+)$`, "m"))?.[1]);
        return { name, lat: num("lat"), lng: num("lng") };
      })
  );
};

test("every catalog coordinate falls inside Kumamoto Prefecture's bounding box — a swapped pair passes the schema (both in range as lng), and a mis-geocoded address would silently put the marker off the map", () => {
  for (const dir of ["projects", "kap92"]) {
    for (const e of entries(dir)) {
      expect(e.lat, `${dir}/${e.name} lat`).toBeGreaterThanOrEqual(LAT.min);
      expect(e.lat, `${dir}/${e.name} lat`).toBeLessThanOrEqual(LAT.max);
      expect(e.lng, `${dir}/${e.name} lng`).toBeGreaterThanOrEqual(LNG.min);
      expect(e.lng, `${dir}/${e.name} lng`).toBeLessThanOrEqual(LNG.max);
    }
  }
});
