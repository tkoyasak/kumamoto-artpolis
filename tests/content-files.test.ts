/// <reference types="bun-types" />

import { expect, test } from "bun:test";

import { rowTransitionName } from "../src/lib/transitions.ts";

const contentDir = (dir: string) => new URL(`../src/content/${dir}`, import.meta.url).pathname;
const mdFiles = (dir: string) => [...new Bun.Glob("*.md").scanSync(contentDir(dir))].sort();
const ids = (dir: string) => mdFiles(dir).map((name) => name.replace(/\.md$/, ""));

test("a status filename is YYYY-MM-DD-HHMM.md — statusDate and the descending sort silently break otherwise", () => {
  const files = mdFiles("status");
  expect(files.length).toBeGreaterThan(0);
  for (const name of files) {
    expect(name).toMatch(/^\d{4}-\d{2}-\d{2}-\d{4}\.md$/);
  }
});

test("a catalog filename is the entry id and URL: lowercase/digits/dashes, so it survives the glob loader's slugify unchanged", () => {
  for (const dir of ["projects", "kap92"]) {
    const files = mdFiles(dir);
    expect(files.length).toBeGreaterThan(0);
    for (const name of files) {
      expect(name).toMatch(/^[a-z0-9][a-z0-9-]*\.md$/);
    }
  }
});

test("every real href gets a distinct transition name — the sanitizer collapses punctuation runs, so distinct ids could collide", () => {
  const hrefs = [
    ...ids("projects").map((id) => `/projects/${id}`),
    ...ids("kap92").map((id) => `/kap92/${id}`),
    ...ids("status").map((id) => `/status/${id}`),
  ];
  const names = hrefs.map(rowTransitionName);
  expect(new Set(names).size).toBe(hrefs.length);
});
