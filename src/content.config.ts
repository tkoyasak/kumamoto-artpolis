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
  // The source page the sync tool re-fetches from. Optional only because
  // kap92 buildings have no prefecture detail page; the tool fills it for
  // every project.
  url: z.url().optional(),
  pdfs: z
    .object({
      ja: z.array(z.url()).min(1).optional(),
      en: z.url().optional(),
    })
    .optional(),
  architects: z.array(z.string().min(1)),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  completedYear: z.number().int().positive().optional(),
  municipality: z.string().min(1),
  use: z.string().min(1),
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
    url: "https://example.com/hall.html",
    architects: ["someone"],
    lat: 32.8,
    lng: 130.7,
    municipality: "kumamoto",
    use: "hall",
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

  test("an excluded marker needs only number/name/reason: official-list rows without a building must not be forced to invent coordinates", () => {
    const excluded = { number: 13, name: "県道橋景観整備", excluded: true, reason: "基礎調査のみ" };
    expect(catalogSchema.safeParse(excluded).success).toBe(true);
    expect(catalogSchema.safeParse({ ...excluded, reason: undefined }).success).toBe(false);
  });
}
