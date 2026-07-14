import { readdirSync } from "node:fs";

import { expect, test } from "vitest";

import { kap92 } from "../src/data/kap92.ts";
import { projects } from "../src/data/projects.ts";
import { rowTransitionName } from "../src/lib/transitions.ts";

const statusFiles = () =>
  readdirSync(new URL("../src/content/status", import.meta.url))
    .filter((name) => name.endsWith(".md"))
    .sort();

test("a status filename is YYYY-MM-DD-HHMM.md — statusDate and the descending sort silently break otherwise", () => {
  const files = statusFiles();
  expect(files.length).toBeGreaterThan(0);
  for (const name of files) {
    expect(name).toMatch(/^\d{4}-\d{2}-\d{2}-\d{4}\.md$/);
  }
});

test("every real href gets a distinct transition name — the sanitizer collapses punctuation runs, so distinct ids could collide", () => {
  const hrefs = [
    ...projects.map((e) => `/projects/${e.id}`),
    ...kap92.map((e) => `/kap92/${e.id}`),
    ...statusFiles().map((name) => `/status/${name.slice(0, -".md".length)}`),
  ];
  const names = hrefs.map(rowTransitionName);
  expect(new Set(names).size).toBe(hrefs.length);
});
