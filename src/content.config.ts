import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { defineCollection, reference } from "astro:content";

import { kap92 as kap92Data } from "./data/kap92.ts";
import { projects as projectsData } from "./data/projects.ts";
import { municipalityOf } from "./lib/address.ts";

const SOURCE_TITLES = [
  "紹介ページ（熊本県）",
  "公式サイト",
  "PDF（日本語）",
  "PDF（英語）",
] as const;

const catalogSchema = z
  .object({
    number: z.number().int().positive(),
    name: z.string().min(1),
    location: z.string().min(1),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    architects: z.array(z.string().min(1)),
    completedYear: z.number().int().positive().optional(),
    use: z.string().min(1),
    sources: z.array(z.object({ title: z.enum(SOURCE_TITLES), url: z.url() })),
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

export type EntryInput = { id: string } & z.input<typeof catalogSchema>;

export type ExcludedRow = { number: number; name: string; reason: string };

const projects = defineCollection({
  loader: () => projectsData,
  schema: catalogSchema,
});

const kap92 = defineCollection({
  loader: () => kap92Data,
  schema: catalogSchema,
});

// The glob loader slugifies the filename into the id, so a visit's filename is
// kept to lowercase/digits/dashes and survives it unchanged.
const statusSchema = z
  .object({
    project: reference("projects").optional(),
    kap92: reference("kap92").optional(),
  })
  .refine((d) => (d.project ? 1 : 0) + (d.kap92 ? 1 : 0) === 1, {
    message: "a status record must reference exactly one entry (project XOR kap92)",
  });

const status = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/status" }),
  schema: statusSchema,
});

export const collections = { projects, kap92, status };

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
    sources: [{ title: "紹介ページ（熊本県）", url: "https://example.com/hall.html" }],
  };
  const withSource = (title: string, url = "https://example.test/x.pdf") => ({
    ...entry,
    sources: [{ title, url }],
  });

  test("a status record references exactly one entry: project XOR kap92 is enforced by the schema, not by convention", () => {
    expect(statusSchema.safeParse({ project: "foo" }).success).toBe(true);
    expect(statusSchema.safeParse({ kap92: "foo" }).success).toBe(true);
    expect(statusSchema.safeParse({ project: "foo", kap92: "bar" }).success).toBe(false);
    expect(statusSchema.safeParse({}).success).toBe(false);
  });

  test("completedYear is optional and only positive: kap92 buildings can be historical or lack a year entirely", () => {
    expect(catalogSchema.safeParse(entry).success).toBe(true);
    expect(catalogSchema.safeParse({ ...entry, completedYear: 1607 }).success).toBe(true);
    expect(catalogSchema.safeParse({ ...entry, completedYear: 0 }).success).toBe(false);
  });

  test("marker coordinates must be a real lat/lng, so a swapped pair can't slip onto the map", () => {
    expect(catalogSchema.safeParse({ ...entry, lat: 130.7, lng: 32.8 }).success).toBe(false);
  });

  test("a source title comes from the closed set, so the same label can't be spelled three ways across the catalog", () => {
    expect(catalogSchema.safeParse(withSource("PDF（日本語）")).success).toBe(true);
    expect(catalogSchema.safeParse(withSource("PDF(日本語)")).success).toBe(false);
    expect(catalogSchema.safeParse({ ...entry, sources: [] }).success).toBe(true);
  });

  test("a malformed source url is rejected", () => {
    expect(catalogSchema.safeParse(withSource("公式サイト", "nope")).success).toBe(false);
  });

  test("municipality is derived from location, not stored — the address is the only place a place is written down", () => {
    expect(catalogSchema.parse(entry)).toMatchObject({ municipality: "熊本市中央区" });
  });

  test("an address the municipality can't be read out of fails the build instead of rendering a ward-less row", () => {
    expect(catalogSchema.safeParse({ ...entry, location: "熊本市某町1-1" }).success).toBe(false);
  });

  test("the schema strips id: an entry's identity is not part of its data", () => {
    expect(catalogSchema.parse({ ...entry, id: "some-hall" })).not.toHaveProperty("id");
  });
}
