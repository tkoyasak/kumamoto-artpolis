/// <reference types="bun-types" />

import { beforeEach, expect, test } from "bun:test";

import type { APIContext } from "astro";

import type { MapEntry } from "../src/lib/map.ts";
import { content, resetContent } from "./helpers/astro-content-mock.ts";

type Collection = "projects" | "kap92";
type CatalogFixture = {
  collection: Collection;
  id: string;
  data: { name: string; lat: number; lng: number };
};

// Dynamic: a static import would link astro:content before the helper's mock registers.
const { GET } = await import("../src/pages/map-markers.json.ts");

const entry = (collection: Collection, id: string): CatalogFixture => ({
  collection,
  id,
  data: { name: id, lat: 32.8, lng: 130.7 },
});

async function markers(): Promise<MapEntry[]> {
  const res = await GET({} as APIContext);
  return (await res.json()) as MapEntry[];
}

beforeEach(resetContent);

test("kap92 markers come before projects: array order is stacking order, so projects paint on top", async () => {
  content.projects = [entry("projects", "a"), entry("projects", "b")];
  content.kap92 = [entry("kap92", "c"), entry("kap92", "d")];
  expect((await markers()).map((m) => m.href)).toEqual([
    "/kap92/c",
    "/kap92/d",
    "/projects/a",
    "/projects/b",
  ]);
});

test("visited is keyed by href, so visiting a project never marks the same-id kap92 building", async () => {
  content.projects = [entry("projects", "foo")];
  content.kap92 = [entry("kap92", "foo")];
  content.status = [
    { id: "2026-01-10-0900", data: { project: { collection: "projects", id: "foo" } } },
  ];
  const visited = new Map((await markers()).map((m) => [m.href, m.visited]));
  expect(visited.get("/projects/foo")).toBe(true);
  expect(visited.get("/kap92/foo")).toBe(false);
});
