import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { defineCollection, reference } from "astro:content";

// Both catalog collections share one schema. The Markdown filename is the
// entry id (ADR 0008) — keep filenames stable; `number` is display/sort only.
// `completedYear` is optional and only `.positive()` (kap92 buildings can be
// historical); `use` is free text.
const catalogSchema = z.object({
  number: z.number().int().positive(),
  name: z.string().min(1),
  architects: z.array(z.string().min(1)),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  completedYear: z.number().int().positive().optional(),
  municipality: z.string().min(1),
  use: z.string().min(1),
});

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
}
