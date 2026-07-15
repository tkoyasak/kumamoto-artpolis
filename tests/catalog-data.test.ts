import { readdirSync, readFileSync } from "node:fs";

import { expect, test } from "vitest";

// Astro's glob loader isn't available in plain Vitest, so these whole-catalog
// invariants read the entry files directly instead of getCollection.

const dir = (d: string) => new URL(`../src/content/${d}/`, import.meta.url);
const mdNames = (d: string) => readdirSync(dir(d)).filter((name) => name.endsWith(".md"));

const numberOf = (d: string, file: string): number => {
  const text = readFileSync(new URL(file, dir(d)), "utf8");
  const match = text.match(/^number: *(\d+)/m);
  if (!match) throw new Error(`no number in ${d}/${file}`);
  return Number(match[1]);
};

test("an id is lowercase, digits and dashes — it is the filename and the URL, and a stray character would slugify the id away from the filename", () => {
  for (const d of ["projects", "kap92"]) {
    for (const file of mdNames(d)) {
      expect(file.slice(0, -".md".length), `${d}/${file}`).toMatch(/^[a-z0-9][a-z0-9-]*$/);
    }
  }
});

test("no official number is both catalogued and excluded — the excluded rows exist to account for the numbers the entries don't", () => {
  const catalogued = new Set(mdNames("projects").map((file) => numberOf("projects", file)));
  for (const file of mdNames("projects/_excluded")) {
    const number = numberOf("projects/_excluded", file);
    expect(catalogued.has(number), `#${number} ${file}`).toBe(false);
  }
});
