import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { defineCollection, reference } from "astro:content";

import { municipalityOf } from "./lib/address.ts";

// Kumamoto Prefecture's bounding box, with a small margin.
const LAT = { min: 32.0, max: 33.3 };
const LNG = { min: 129.9, max: 131.4 };

const catalogSchema = z
  .object({
    number: z.number().int().positive(),
    name: z.string().min(1),
    location: z.string().min(1),
    lat: z.number().min(LAT.min).max(LAT.max),
    lng: z.number().min(LNG.min).max(LNG.max),
    architects: z.array(z.string().min(1)),
    completedYear: z.number().int().positive().optional(),
    use: z.string().min(1),
  })
  .transform((data, ctx) => {
    const municipality = municipalityOf(data.location);
    if (!municipality) {
      ctx.addIssue({
        code: "custom",
        path: ["location"],
        message: `no municipality in 「${data.location}」 (a 熊本市 address must name its ward)`,
      });
      return z.NEVER;
    }
    return { ...data, municipality };
  });

const projects = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/projects" }),
  schema: catalogSchema,
});

const kap92 = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/kap92" }),
  schema: catalogSchema,
});

// Official-list rows with no building — their own collection, never entries.
const excluded = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/projects/_excluded" }),
  schema: z.object({
    number: z.number().int().positive(),
    name: z.string().min(1),
    reason: z.string().min(1),
  }),
});

// The glob loader slugifies the filename into the id, so a visit's filename is
// kept to lowercase/digits/dashes and survives it unchanged.
const statusSchema = z.xor(
  [z.object({ entry: reference("projects") }), z.object({ entry: reference("kap92") })],
  "a status record's entry is one { collection, id } naming a projects or kap92 entry",
);

const status = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/status" }),
  schema: statusSchema,
});

export const collections = { projects, kap92, excluded, status };

if (import.meta.vitest) {
  const { expect, test } = import.meta.vitest;

  const entry = {
    number: 1,
    name: "some hall",
    location: "熊本市中央区某町1-1",
    lat: 32.8,
    lng: 130.7,
    architects: ["someone"],
    use: "hall",
  };

  test("a status record names exactly one entry: the reference is one field, so two entries cannot be named at all", () => {
    expect(statusSchema.safeParse({ entry: { collection: "projects", id: "foo" } }).success).toBe(
      true,
    );
    expect(statusSchema.safeParse({ entry: { collection: "kap92", id: "foo" } }).success).toBe(
      true,
    );
    expect(statusSchema.safeParse({}).success).toBe(false);
  });

  test("an entry reference names its collection, so a bare id — which would belong to both collections — is rejected", () => {
    expect(statusSchema.safeParse({ entry: "foo" }).success).toBe(false);
    expect(statusSchema.safeParse({ entry: { collection: "kap-92", id: "foo" } }).success).toBe(
      false,
    );
  });

  test("completedYear is optional and only positive: kap92 buildings can be historical or lack a year entirely", () => {
    expect(catalogSchema.safeParse(entry).success).toBe(true);
    expect(catalogSchema.safeParse({ ...entry, completedYear: 1607 }).success).toBe(true);
    expect(catalogSchema.safeParse({ ...entry, completedYear: 0 }).success).toBe(false);
  });

  test("coordinates outside Kumamoto's bounding box fail the build, so a swapped pair or a mis-geocode can't slip onto the map", () => {
    expect(catalogSchema.safeParse({ ...entry, lat: 130.7, lng: 32.8 }).success).toBe(false);
    expect(catalogSchema.safeParse({ ...entry, lat: 35.68, lng: 139.77 }).success).toBe(false);
  });

  test("municipality is derived from location, not stored — the address is the only place a place is written down", () => {
    expect(catalogSchema.parse(entry)).toMatchObject({ municipality: "熊本市中央区" });
  });

  test("an address the municipality can't be read out of fails the build instead of rendering a ward-less row", () => {
    expect(catalogSchema.safeParse({ ...entry, location: "熊本市某町1-1" }).success).toBe(false);
  });
}
