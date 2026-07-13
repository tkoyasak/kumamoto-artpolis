import { readdirSync, readFileSync } from "node:fs";

import { expect, test } from "vitest";

import { rowTransitionName } from "../src/lib/transitions.ts";

const mdFiles = (dir: string) =>
  readdirSync(new URL(`../src/content/${dir}`, import.meta.url))
    .filter((name) => name.endsWith(".md"))
    .sort();
const ids = (dir: string) => mdFiles(dir).map((name) => name.replace(/\.md$/, ""));

test("a status filename is YYYY-MM-DD-HHMM.md — statusDate and the descending sort silently break otherwise", () => {
  const files = mdFiles("status");
  expect(files.length).toBeGreaterThan(0);
  for (const name of files) {
    expect(name).toMatch(/^\d{4}-\d{2}-\d{2}-\d{4}\.md$/);
  }
});

test("a catalog filename is the entry id and URL: NNNN-<slug> in lowercase/digits/dashes, so it survives the glob loader's slugify unchanged and sorts in official-number order", () => {
  for (const dir of ["projects", "kap92"]) {
    const files = mdFiles(dir);
    expect(files.length).toBeGreaterThan(0);
    for (const name of files) {
      expect(name).toMatch(/^\d{4}-[a-z0-9][a-z0-9-]*\.md$/);
    }
  }
});

test("a catalog filename's number prefix matches the frontmatter number — a mismatch would put the wrong official number in the URL while sorting by the right one", () => {
  for (const dir of ["projects", "kap92"]) {
    for (const name of mdFiles(dir)) {
      const raw = readFileSync(new URL(`../src/content/${dir}/${name}`, import.meta.url), "utf8");
      const number = Number(raw.match(/^number: (\d+)$/m)?.[1]);
      expect(Number(name.slice(0, 4)), `${dir}/${name}`).toBe(number);
    }
  }
});

test("where an address does name a ward, municipality agrees with it — municipality is geocoded, not parsed out of location (ADR 0015), and this is the only place the two can be cross-checked", () => {
  for (const dir of ["projects", "kap92"]) {
    for (const name of mdFiles(dir)) {
      const raw = readFileSync(new URL(`../src/content/${dir}/${name}`, import.meta.url), "utf8");
      const ward = raw.match(/^location: .*?(熊本市(?:中央|東|西|南|北)区)/m)?.[1];
      if (!ward) continue;
      expect(raw.match(/^municipality: (.+)$/m)?.[1], `${dir}/${name}`).toBe(ward);
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
