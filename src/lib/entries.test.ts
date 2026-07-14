import { beforeEach, expect, test, vi } from "vitest";

import { entryStaticPaths, getEntryRows } from "./entries.ts";

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
type Ref = { collection: Collection; id: string };
type StatusFixture = { id: string; data: { entry: Ref } };

const fixtures = vi.hoisted(() => ({
  projects: [] as unknown[],
  kap92: [] as unknown[],
  status: [] as unknown[],
}));

vi.mock("astro:content", () => ({
  getCollection: async (name: keyof typeof fixtures) => fixtures[name],
  getEntry: async () => undefined,
}));

const entry = (collection: Collection, id: string, number: number): CatalogFixture => ({
  collection,
  id,
  data: { number, name: id, architects: ["someone"], use: "hall", municipality: "kumamoto" },
});

beforeEach(() => {
  fixtures.projects = [];
  fixtures.kap92 = [];
  fixtures.status = [];
});

test("getEntryRows merges both collections into one row list — order is the island's job, presence is this module's", async () => {
  fixtures.projects = [entry("projects", "p1", 3)];
  fixtures.kap92 = [entry("kap92", "k1", 2)];
  const rows = await getEntryRows();
  expect(rows.map((r) => r.href).sort()).toEqual(["/kap92/k1", "/projects/p1"]);
});

test("a missing completedYear becomes null, so the row shape has no optional holes", async () => {
  fixtures.projects = [entry("projects", "p1", 1)];
  const [row] = await getEntryRows();
  expect(row?.completedYear).toBeNull();
});

test("entryStaticPaths keys each page by entry id and hands it its visits — an empty list, not absence, when unvisited", async () => {
  fixtures.projects = [entry("projects", "seen", 1), entry("projects", "unseen", 2)];
  fixtures.status = [
    { id: "2026-01-10-0900", data: { entry: { collection: "projects", id: "seen" } } },
  ] satisfies StatusFixture[];
  const paths = await entryStaticPaths("projects");
  const byId = new Map(paths.map((p) => [p.params.id, p.props.visits]));
  expect(byId.get("seen")).toEqual(["2026-01-10-0900"]);
  expect(byId.get("unseen")).toEqual([]);
});
