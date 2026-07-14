import { beforeEach, expect, test, vi } from "vitest";

import { getVisitsByEntry } from "./visits.ts";

type Ref = { collection: "projects" | "kap92"; id: string };
type StatusFixture = { id: string; data: { entry: Ref } };

const fixtures = vi.hoisted(() => ({
  status: [] as { id: string; data: { entry: { collection: string; id: string } } }[],
}));

vi.mock("astro:content", () => ({
  getCollection: async () => fixtures.status,
  getEntry: async () => undefined,
}));

const project = (id: string): Ref => ({ collection: "projects", id });
const kap92 = (id: string): Ref => ({ collection: "kap92", id });
const visits = (records: StatusFixture[]) => {
  fixtures.status = records as typeof fixtures.status;
};

beforeEach(() => {
  fixtures.status = [];
});

test("visits are keyed by entry href, so the same id in projects and kap92 cannot collide", async () => {
  visits([
    { id: "2026-01-10-0900", data: { entry: project("foo") } },
    { id: "2026-02-20-1400", data: { entry: kap92("foo") } },
  ]);
  const byEntry = await getVisitsByEntry();
  expect(byEntry.get("/projects/foo")).toEqual(["2026-01-10-0900"]);
  expect(byEntry.get("/kap92/foo")).toEqual(["2026-02-20-1400"]);
});

test("an entry's visit ids come newest first, whatever order the records load in", async () => {
  visits([
    { id: "2026-01-10-0900", data: { entry: project("foo") } },
    { id: "2026-03-05-1100", data: { entry: project("foo") } },
    { id: "2026-02-20-1400", data: { entry: project("foo") } },
  ]);
  const byEntry = await getVisitsByEntry();
  expect(byEntry.get("/projects/foo")).toEqual([
    "2026-03-05-1100",
    "2026-02-20-1400",
    "2026-01-10-0900",
  ]);
});
