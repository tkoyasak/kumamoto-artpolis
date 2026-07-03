import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { defineCollection, reference } from "astro:content";

// Both catalog collections share one schema. `projects` are Artpolis commissioned
// new builds; `kap92` are selected existing buildings. The frontmatter `slug` is
// the entry id (the glob loader uses a `slug` field as the id), the URL key
// (/projects/<slug>, /kap92/<slug>), and how `status` references an entry — keep it
// stable; code reads `entry.data.slug` explicitly rather than `entry.id`. `number`
// is the official Artpolis / prefecture-list number, used for display and sorting.
//
// `completedYear` is optional and only `.positive()` (kap92 buildings can be
// historical / lack a precise year); `use` is free text (kap92 ranges beyond
// projects' building types).
const catalogSchema = z.object({
  number: z.number().int().positive(),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(1),
  architects: z.array(z.string().min(1)),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  completedYear: z.number().int().positive().optional(),
  municipality: z.string().min(1),
  use: z.string().min(1),
});

const projects = defineCollection({
  loader: glob({ pattern: "*.md", base: "./content/projects" }),
  schema: catalogSchema,
});

const kap92 = defineCollection({
  loader: glob({ pattern: "*.md", base: "./content/kap92" }),
  schema: catalogSchema,
});

// One Markdown file per day, named by date (e.g. 2025-11-03.md). Filename ->
// entry id -> the /status/<date> route. `projects` lists which projects were
// visited that day (the source of truth for visit dates). Body holds the day's
// notes and photos (photos referenced as public R2 URLs).
const status = defineCollection({
  loader: glob({ pattern: "*.md", base: "./content/status" }),
  schema: z.object({
    projects: z.array(reference("projects")).default([]),
  }),
});

export const collections = { projects, kap92, status };
