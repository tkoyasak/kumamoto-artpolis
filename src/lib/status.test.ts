import { beforeEach, expect, test, vi } from "vitest";

import { getStatusRows } from "./status.ts";

type Collection = "projects" | "kap92";
type CatalogFixture = { collection: Collection; id: string; data: { name: string } };
type Ref = { collection: Collection; id: string };
type StatusFixture = { id: string; data: { project?: Ref; kap92?: Ref } };

const fixtures = vi.hoisted(() => ({
  status: [] as unknown[],
  entries: new Map<string, unknown>(),
}));

vi.mock("astro:content", () => ({
  getCollection: async () => fixtures.status,
  getEntry: async (ref: { collection: string; id: string }) =>
    fixtures.entries.get(`${ref.collection}/${ref.id}`),
}));

const catalog = (collection: Collection, id: string): Ref => {
  const fixture: CatalogFixture = { collection, id, data: { name: id } };
  fixtures.entries.set(`${collection}/${id}`, fixture);
  return fixture;
};

const visitOf = (id: string, ref: Ref): StatusFixture =>
  ref.collection === "projects" ? { id, data: { project: ref } } : { id, data: { kap92: ref } };

beforeEach(() => {
  fixtures.status = [];
  fixtures.entries = new Map();
});

test("a timeline row derives date and href from its id, and name, outline category, and marker key from the visited entry", async () => {
  const ref = catalog("kap92", "old-hall");
  fixtures.status = [visitOf("2026-01-10-0900", ref)];
  const [row] = await getStatusRows();
  expect(row).toEqual({
    id: "2026-01-10-0900",
    date: "2026-01-10",
    href: "/status/2026-01-10-0900",
    name: "old-hall",
    category: "kap92",
    entryHref: "/kap92/old-hall",
  });
});

test("a status record referencing a missing entry (typo'd or deleted id) fails the build instead of being dropped", async () => {
  fixtures.status = [visitOf("2026-01-10-0900", { collection: "projects", id: "no-such-entry" })];
  await expect(getStatusRows()).rejects.toThrow("references missing entry");
});
