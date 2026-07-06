/// <reference types="bun-types" />

import { beforeEach, expect, test } from "bun:test";

import { content, resetContent } from "../../tests/helpers/astro-content-mock.ts";

type Ref = { collection: "projects" | "kap92"; id: string };
type StatusFixture = { id: string; data: { project?: Ref; kap92?: Ref } };

// Dynamic: a static import would link astro:content before the helper's mock registers.
const { getVisitsByEntry } = await import("./visits.ts");

const project = (id: string): Ref => ({ collection: "projects", id });
const kap92 = (id: string): Ref => ({ collection: "kap92", id });
const visits = (records: StatusFixture[]) => {
  content.status = records;
};

beforeEach(resetContent);

test("visits are keyed by entry href, so the same id in projects and kap92 cannot collide", async () => {
  visits([
    { id: "2026-01-10-0900", data: { project: project("foo") } },
    { id: "2026-02-20-1400", data: { kap92: kap92("foo") } },
  ]);
  const byEntry = await getVisitsByEntry();
  expect(byEntry.get("/projects/foo")).toEqual(["2026-01-10-0900"]);
  expect(byEntry.get("/kap92/foo")).toEqual(["2026-02-20-1400"]);
});

test("an entry's visit ids come newest first, whatever order the records load in", async () => {
  visits([
    { id: "2026-01-10-0900", data: { project: project("foo") } },
    { id: "2026-03-05-1100", data: { project: project("foo") } },
    { id: "2026-02-20-1400", data: { project: project("foo") } },
  ]);
  const byEntry = await getVisitsByEntry();
  expect(byEntry.get("/projects/foo")).toEqual([
    "2026-03-05-1100",
    "2026-02-20-1400",
    "2026-01-10-0900",
  ]);
});

test("a status record with no entry reference fails the build instead of being silently dropped", async () => {
  visits([{ id: "2026-01-10-0900", data: {} }]);
  const failure = await getVisitsByEntry().then(
    () => null,
    (error: unknown) => error,
  );
  expect(failure).toBeInstanceOf(Error);
  expect((failure as Error).message).toContain("no entry reference");
});
