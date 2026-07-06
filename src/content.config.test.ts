/// <reference types="bun-types" />

import { expect, test } from "bun:test";

import { z } from "astro/zod";

import "../tests/helpers/astro-content-mock.ts";

// Dynamic: a static import would link astro:content before the helper's mock registers.
const { collections } = await import("./content.config.ts");
const schemas = collections as unknown as Record<
  "projects" | "kap92" | "status",
  { schema: z.ZodTypeAny }
>;

const catalogFrontmatter = {
  number: 1,
  name: "some hall",
  architects: ["someone"],
  lat: 32.8,
  lng: 130.7,
  municipality: "kumamoto",
  use: "hall",
};

test("a status record references exactly one entry: project XOR kap92 is enforced by the schema, not by convention", () => {
  expect(schemas.status.schema.safeParse({ project: "foo" }).success).toBe(true);
  expect(schemas.status.schema.safeParse({ kap92: "foo" }).success).toBe(true);
  expect(schemas.status.schema.safeParse({ project: "foo", kap92: "bar" }).success).toBe(false);
  expect(schemas.status.schema.safeParse({}).success).toBe(false);
});

test("completedYear is optional and only positive: kap92 buildings can be historical or lack a year entirely", () => {
  expect(schemas.kap92.schema.safeParse(catalogFrontmatter).success).toBe(true);
  expect(
    schemas.kap92.schema.safeParse({ ...catalogFrontmatter, completedYear: 1607 }).success,
  ).toBe(true);
  expect(schemas.kap92.schema.safeParse({ ...catalogFrontmatter, completedYear: 0 }).success).toBe(
    false,
  );
});

test("marker coordinates must be a real lat/lng, so a swapped pair can't slip onto the map", () => {
  expect(
    schemas.projects.schema.safeParse({ ...catalogFrontmatter, lat: 130.7, lng: 32.8 }).success,
  ).toBe(false);
});
