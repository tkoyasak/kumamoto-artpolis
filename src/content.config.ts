import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { defineCollection, reference } from "astro:content";

// Both catalog collections share one schema. The Markdown filename is the
// entry id, `NNNN-<slug>` (ADR 0008/0014) — keep filenames stable; `number`
// is display/sort only (a test pins prefix == number). The frontmatter is the
// source of truth the sync tool fills and diffs against (ADR 0013); the body
// is human-owned prose. `completedYear` is optional and only `.positive()`
// (kap92 buildings can be historical); `use` is free text.
const activeSchema = z.object({
  number: z.number().int().positive(),
  name: z.string().min(1),
  // The official 所在地, verbatim — the datum lat/lng are geocoded from, and
  // the only field that can catch the prefecture rewriting an address.
  // Optional: a few pages carry no 所在地, and kap92 has no page at all.
  // `municipality` is NOT derived from it: pre-2012 熊本市 addresses name no
  // ward, so the ward comes from geocoding (ADR 0015).
  location: z.string().min(1).optional(),
  municipality: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  architects: z.array(z.string().min(1)),
  completedYear: z.number().int().positive().optional(),
  use: z.string().min(1),
  // The source page the sync tool re-fetches from. Optional only because
  // kap92 buildings have no prefecture detail page; the tool fills it for
  // every project.
  url: z.url().optional(),
  pdfJa: z.array(z.url()).min(1).optional(),
  pdfEn: z.array(z.url()).min(1).optional(),
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
    municipality: "熊本市中央区",
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

  test("municipality is required while location is optional: the ward is geocoded, not parsed out of the address (ADR 0015)", () => {
    const { location: _location, ...withoutLocation } = catalogFrontmatter;
    expect(catalogSchema.safeParse(withoutLocation).success).toBe(true);
    const { municipality: _municipality, ...withoutMunicipality } = catalogFrontmatter;
    expect(catalogSchema.safeParse(withoutMunicipality).success).toBe(false);
  });

  test("an excluded marker needs only number/name/reason: official-list rows without a building must not be forced to invent coordinates", () => {
    const excluded = { number: 13, name: "県道橋景観整備", excluded: true, reason: "基礎調査のみ" };
    expect(catalogSchema.safeParse(excluded).success).toBe(true);
    expect(catalogSchema.safeParse({ ...excluded, reason: undefined }).success).toBe(false);
  });
}
