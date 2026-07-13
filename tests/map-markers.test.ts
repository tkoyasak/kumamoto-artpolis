import type { APIContext } from "astro";
import { beforeEach, expect, test, vi } from "vitest";

import type { MapEntry } from "../src/lib/map.ts";
// Not colocated: a test file in src/pages would itself become a route.
import { GET } from "../src/pages/map-markers.json.ts";

type Collection = "projects" | "kap92";
type CatalogFixture = {
  collection: Collection;
  id: string;
  data: { name: string; lat: number; lng: number };
};

const fixtures = vi.hoisted(() => ({
  projects: [] as unknown[],
  kap92: [] as unknown[],
  status: [] as unknown[],
}));

vi.mock("astro:content", () => ({
  getCollection: async (name: keyof typeof fixtures) => fixtures[name],
  getEntry: async () => undefined,
}));

const entry = (collection: Collection, id: string): CatalogFixture => ({
  collection,
  id,
  data: { name: id, lat: 32.8, lng: 130.7 },
});

async function markers(): Promise<MapEntry[]> {
  const res = await GET({} as APIContext);
  return (await res.json()) as MapEntry[];
}

beforeEach(() => {
  fixtures.projects = [];
  fixtures.kap92 = [];
  fixtures.status = [];
});

test("kap92 markers come before projects: array order is stacking order, so projects paint on top", async () => {
  fixtures.projects = [entry("projects", "a"), entry("projects", "b")];
  fixtures.kap92 = [entry("kap92", "c"), entry("kap92", "d")];
  expect((await markers()).map((m) => m.href)).toEqual([
    "/kap92/c",
    "/kap92/d",
    "/projects/a",
    "/projects/b",
  ]);
});

test("an excluded marker row (a list number without a building) never becomes a map marker", async () => {
  fixtures.projects = [
    entry("projects", "a"),
    {
      collection: "projects",
      id: "x",
      data: { number: 13, name: "x", excluded: true, reason: "r" },
    },
  ];
  expect((await markers()).map((m) => m.href)).toEqual(["/projects/a"]);
});

test("visited is keyed by href, so visiting a project never marks the same-id kap92 building", async () => {
  fixtures.projects = [entry("projects", "foo")];
  fixtures.kap92 = [entry("kap92", "foo")];
  fixtures.status = [
    { id: "2026-01-10-0900", data: { project: { collection: "projects", id: "foo" } } },
  ];
  const visited = new Map((await markers()).map((m) => [m.href, m.visited]));
  expect(visited.get("/projects/foo")).toBe(true);
  expect(visited.get("/kap92/foo")).toBe(false);
});
