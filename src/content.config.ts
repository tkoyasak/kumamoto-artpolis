import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { defineCollection, reference } from "astro:content";

// Both catalog collections share one schema. `projects` are Artpolis commissioned
// new builds; `kap92` are selected existing buildings. The Markdown filename is the
// slug: the glob loader derives `entry.id` from it, so the id is the URL key
// (/projects/<slug>, /kap92/<slug>) and how `status` references an entry — keep
// filenames stable. `number` is the official Artpolis / prefecture-list number, a
// frontmatter field used only for display and sorting (never for identity).
//
// `completedYear` is optional and only `.positive()` (kap92 buildings can be
// historical / lack a precise year); `use` is free text (kap92 ranges beyond
// projects' building types).
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

// One Markdown file per visit, named `<date>-<HHMM>.md` (e.g. 2025-11-03-1420.md).
// It reads as a colon-free ISO datetime, but stays lowercase/digits/dashes so the
// filename survives the glob loader's slugify unchanged: filename == entry id ==
// URL. Filename -> entry id -> the /status/<datetime> route and the single sort
// key (it sorts lexically, so newest-first is `id` descending); the date is
// `id.slice(0, 10)`. Each record
// references exactly one visited entry via `project` XOR `kap92` (the schema's
// refine enforces it), so a record maps to one collection — which is what lets
// the timeline table outline each row in its entry's collection color. The
// reference is the source of truth for who was visited when; body holds the
// visit's notes and photos (photos referenced as public R2 URLs).
const status = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/status" }),
  schema: z
    .object({
      project: reference("projects").optional(),
      kap92: reference("kap92").optional(),
    })
    .refine((d) => (d.project ? 1 : 0) + (d.kap92 ? 1 : 0) === 1, {
      message: "a status record must reference exactly one entry (project XOR kap92)",
    }),
});

export const collections = { projects, kap92, status };
