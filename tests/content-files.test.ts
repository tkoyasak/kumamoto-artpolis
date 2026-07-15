import { readdirSync } from "node:fs";

import { expect, test } from "vitest";

import { rowTransitionName } from "../src/lib/transitions.ts";

const idsIn = (dir: string) =>
  readdirSync(new URL(`../src/content/${dir}`, import.meta.url))
    .filter((name) => name.endsWith(".md"))
    .map((name) => name.slice(0, -".md".length));

test("a status filename is YYYY-MM-DD-HHMM.md — statusDate and the descending sort silently break otherwise", () => {
  const ids = idsIn("status").sort();
  expect(ids.length).toBeGreaterThan(0);
  for (const id of ids) {
    expect(`${id}.md`).toMatch(/^\d{4}-\d{2}-\d{2}-\d{4}\.md$/);
  }
});

test("every real href gets a distinct transition name — the sanitizer collapses punctuation runs, so distinct ids could collide", () => {
  const hrefs = [
    ...idsIn("projects").map((id) => `/projects/${id}`),
    ...idsIn("kap92").map((id) => `/kap92/${id}`),
    ...idsIn("status").map((id) => `/status/${id}`),
  ];
  const names = hrefs.map(rowTransitionName);
  expect(new Set(names).size).toBe(hrefs.length);
});
