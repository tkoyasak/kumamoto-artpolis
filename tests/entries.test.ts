/// <reference types="bun-types" />

import { beforeEach, expect, test } from "bun:test";

import { content, resetContent } from "./helpers/astro-content-mock.ts";

type Collection = "projects" | "kap92";
type CatalogFixture = {
  collection: Collection;
  id: string;
  data: {
    number: number;
    name: string;
    architects: string[];
    use: string;
    municipality: string;
    completedYear?: number;
  };
};

// Dynamic: a static import would link astro:content before the helper's mock registers.
const { entryStaticPaths, getEntryRows } = await import("../src/lib/entries.ts");

const entry = (collection: Collection, id: string, number: number): CatalogFixture => ({
  collection,
  id,
  data: { number, name: id, architects: ["someone"], use: "hall", municipality: "kumamoto" },
});

beforeEach(resetContent);

test("home rows sort projects before kap92, then by official number within each", async () => {
  content.projects = [entry("projects", "p2", 20), entry("projects", "p1", 3)];
  content.kap92 = [entry("kap92", "k2", 10), entry("kap92", "k1", 2)];
  const rows = await getEntryRows();
  expect(rows.map((r) => r.href)).toEqual([
    "/projects/p1",
    "/projects/p2",
    "/kap92/k1",
    "/kap92/k2",
  ]);
});

test("a missing completedYear becomes null, so the row shape has no optional holes", async () => {
  content.projects = [entry("projects", "p1", 1)];
  const [row] = await getEntryRows();
  expect(row?.completedYear).toBeNull();
});

test("entryStaticPaths keys each page by entry id and hands it its visits — an empty list, not absence, when unvisited", async () => {
  content.projects = [entry("projects", "seen", 1), entry("projects", "unseen", 2)];
  content.status = [
    { id: "2026-01-10-0900", data: { project: { collection: "projects", id: "seen" } } },
  ];
  const paths = await entryStaticPaths("projects");
  const byId = new Map(paths.map((p) => [p.params.id, p.props.visits]));
  expect(byId.get("seen")).toEqual(["2026-01-10-0900"]);
  expect(byId.get("unseen")).toEqual([]);
});
