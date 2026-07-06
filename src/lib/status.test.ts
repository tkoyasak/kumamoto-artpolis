/// <reference types="bun-types" />

import { beforeEach, expect, test } from "bun:test";

import {
  content,
  type MockRef,
  refKey,
  resetContent,
} from "../../tests/helpers/astro-content-mock.ts";

type Collection = "projects" | "kap92";
type CatalogFixture = { collection: Collection; id: string; data: { name: string } };
type StatusFixture = { id: string; data: { project?: MockRef; kap92?: MockRef } };

// Dynamic: a static import would link astro:content before the helper's mock registers.
const { getStatusRows } = await import("./status.ts");

const catalog = (collection: Collection, id: string) => {
  const fixture: CatalogFixture = { collection, id, data: { name: id } };
  content.entries.set(refKey(fixture), fixture);
  return fixture;
};

const visitOf = (id: string, ref: MockRef): StatusFixture =>
  ref.collection === "projects" ? { id, data: { project: ref } } : { id, data: { kap92: ref } };

beforeEach(resetContent);

test("timeline rows come newest first: the datetime id orders across days and within one day by one descending sort", async () => {
  const ref = catalog("projects", "foo");
  content.status = [
    visitOf("2026-01-10-0900", ref),
    visitOf("2026-02-20-1400", ref),
    visitOf("2026-02-20-0800", ref),
  ];
  const rows = await getStatusRows();
  expect(rows.map((r) => r.id)).toEqual(["2026-02-20-1400", "2026-02-20-0800", "2026-01-10-0900"]);
});

test("a timeline row derives date and href from its id, and name and outline category from the visited entry", async () => {
  const ref = catalog("kap92", "old-hall");
  content.status = [visitOf("2026-01-10-0900", ref)];
  const [row] = await getStatusRows();
  expect(row).toEqual({
    id: "2026-01-10-0900",
    date: "2026-01-10",
    href: "/status/2026-01-10-0900",
    name: "old-hall",
    category: "kap92",
  });
});

test("a status record referencing a missing entry (typo'd or deleted id) fails the build instead of being dropped", async () => {
  content.status = [visitOf("2026-01-10-0900", { collection: "projects", id: "no-such-entry" })];
  const failure = await getStatusRows().then(
    () => null,
    (error: unknown) => error,
  );
  expect(failure).toBeInstanceOf(Error);
  expect((failure as Error).message).toContain("references missing entry");
});
