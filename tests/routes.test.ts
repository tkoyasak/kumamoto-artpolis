/// <reference types="bun-types" />

import { expect, test } from "bun:test";

import { entryHref, normalizePath, statusDate } from "../src/lib/routes.ts";

test("normalizePath strips Cloudflare's auto-trailing-slash, so live paths compare equal to built hrefs", () => {
  expect(normalizePath("/projects/foo/")).toBe("/projects/foo");
  expect(normalizePath("/projects/foo")).toBe("/projects/foo");
});

test("normalizePath keeps the root path: its slash is the path, not a suffix", () => {
  expect(normalizePath("/")).toBe("/");
});

test("an entry href embeds the collection, so the same id in projects and kap92 yields distinct keys", () => {
  expect(entryHref({ collection: "projects", id: "foo" })).toBe("/projects/foo");
  expect(entryHref({ collection: "kap92", id: "foo" })).toBe("/kap92/foo");
});

test("a status id's first 10 characters are its visit date", () => {
  expect(statusDate("2026-01-10-0900")).toBe("2026-01-10");
});
