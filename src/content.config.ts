import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { defineCollection, reference } from "astro:content";

import { municipalityOf } from "./lib/address.ts";

// Both catalog collections share one schema. The Markdown filename is the
// entry id, `NNNN-<slug>` (ADR 0008/0014) — keep filenames stable; `number`
// is display/sort only (a test pins prefix == number). The frontmatter is the
// source of truth the sync tool fills and diffs against (ADR 0013); the body
// is human-owned prose. `completedYear` is optional and only `.positive()`
// (kap92 buildings can be historical); `use` is free text.
// `municipality` is not a field: it is derived from `location` (ADR 0016), so
// the address is the only place a place is written down. The derivation
// rejects a ward-less 熊本市 address, which fails the build rather than
// quietly showing a coarser municipality than the entry deserves.
const activeSchema = z
  .object({
    number: z.number().int().positive(),
    name: z.string().min(1),
    // The address, hand-curated: the prefecture's 所在地 with the 政令市 ward
    // filled in where its pre-2012 wording omits one. Coordinates are geocoded
    // from it.
    location: z.string().min(1),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    architects: z.array(z.string().min(1)),
    completedYear: z.number().int().positive().optional(),
    use: z.string().min(1),
    // The entry's page on the prefecture site — what `bun run check-projects`
    // re-fetches to compare against. kap92 buildings have none.
    url: z.url().optional(),
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

// Official-list rows that are not visitable buildings (plans, programmes)
// stay in the collection as excluded markers so the sync tool knows the
// number is accounted for; the site never renders them (ADR 0013).
const excludedSchema = z.object({
  number: z.number().int().positive(),
  name: z.string().min(1),
  excluded: z.literal(true),
  reason: z.string().min(1),
});

const catalogSchema = z.union([excludedSchema, activeSchema]);

const projects = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/projects" }),
  schema: catalogSchema,
});

const kap92 = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/kap92" }),
  schema: catalogSchema,
});

// One Markdown file per visit, named `<date>-<HHMM>.md` — a colon-free ISO
// datetime kept lowercase/digits/dashes so the filename survives the glob
// loader's slugify unchanged (filename == entry id == URL). Each record
// references exactly one visited entry (ADR 0009); the body holds the visit's
// notes and photos (public R2 URLs).
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

  const catalogFrontmatter = {
    number: 1,
    name: "some hall",
    location: "熊本市中央区某町1-1",
    lat: 32.8,
    lng: 130.7,
    architects: ["someone"],
    use: "hall",
    url: "https://example.com/hall.html",
  };

  test("a status record references exactly one entry: project XOR kap92 is enforced by the schema, not by convention", () => {
    expect(statusSchema.safeParse({ project: "foo" }).success).toBe(true);
    expect(statusSchema.safeParse({ kap92: "foo" }).success).toBe(true);
    expect(statusSchema.safeParse({ project: "foo", kap92: "bar" }).success).toBe(false);
    expect(statusSchema.safeParse({}).success).toBe(false);
  });

  test("completedYear is optional and only positive: kap92 buildings can be historical or lack a year entirely", () => {
    expect(catalogSchema.safeParse(catalogFrontmatter).success).toBe(true);
    expect(catalogSchema.safeParse({ ...catalogFrontmatter, completedYear: 1607 }).success).toBe(
      true,
    );
    expect(catalogSchema.safeParse({ ...catalogFrontmatter, completedYear: 0 }).success).toBe(
      false,
    );
  });

  test("marker coordinates must be a real lat/lng, so a swapped pair can't slip onto the map", () => {
    expect(catalogSchema.safeParse({ ...catalogFrontmatter, lat: 130.7, lng: 32.8 }).success).toBe(
      false,
    );
  });

  test("a malformed source url is rejected, but a kap92 building may have none at all", () => {
    expect(catalogSchema.safeParse({ ...catalogFrontmatter, url: "nope" }).success).toBe(false);
    const { url: _url, ...withoutUrl } = catalogFrontmatter;
    expect(catalogSchema.safeParse(withoutUrl).success).toBe(true);
  });

  test("municipality is derived from location, not stored — the address is the only place a place is written down (ADR 0016)", () => {
    const parsed = catalogSchema.parse(catalogFrontmatter);
    expect(parsed).toMatchObject({ municipality: "熊本市中央区" });
  });

  test("an address the municipality can't be read out of fails the build instead of rendering a ward-less row", () => {
    const wardless = { ...catalogFrontmatter, location: "熊本市某町1-1" };
    expect(catalogSchema.safeParse(wardless).success).toBe(false);
    const { location: _location, ...withoutLocation } = catalogFrontmatter;
    expect(catalogSchema.safeParse(withoutLocation).success).toBe(false);
  });

  test("an excluded marker needs only number/name/reason: official-list rows without a building must not be forced to invent coordinates", () => {
    const excluded = { number: 13, name: "県道橋景観整備", excluded: true, reason: "基礎調査のみ" };
    expect(catalogSchema.safeParse(excluded).success).toBe(true);
    expect(catalogSchema.safeParse({ ...excluded, reason: undefined }).success).toBe(false);
  });
}
