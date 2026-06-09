import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { defineCollection } from "astro:content";

// One Markdown file per project: frontmatter holds the metadata (validated by
// the schema below), the body holds the prose description. The entry id comes
// from the filename (e.g. 1.md -> "1"), matching the /projects/<number> route.
const projects = defineCollection({
  loader: glob({ pattern: "*.md", base: "./content/projects" }),
  schema: z.object({
    // Official Art Polis sequential number. Also the URL key (/projects/<number>).
    number: z.number().int().positive(),
    name: z.string().min(1),
    architects: z.array(z.string().min(1)).nonempty(),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    completedYear: z.number().int().gt(1900),
    municipality: z.string().min(1),
    use: z.enum(["公共施設", "集合住宅", "学校", "公園", "橋梁", "駅", "その他"]),
    // Each "YYYY-MM-DD". Empty means not visited yet.
    visitedDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).default([]),
  }),
});

// One Markdown file per day, named by date (e.g. 2025-11-03.md). Filename ->
// entry id -> the /status/<date> route. Body holds the day's notes and photos
// (photos referenced as public R2 URLs). Frontmatter is optional.
const status = defineCollection({
  loader: glob({ pattern: "*.md", base: "./content/status" }),
  schema: z.object({}),
});

export const collections = { projects, status };
