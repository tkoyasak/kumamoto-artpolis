import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { defineCollection, reference } from "astro:content";

// One Markdown file per project, named by number (1.md ...). The frontmatter
// `slug` is the entry id (the glob loader uses a `slug` field as the id), so it
// is the URL key (/projects/<slug>) and how `status` references the project.
// Code reads `entry.data.slug` explicitly rather than `entry.id`. `number` is
// the official Art Polis number, used for display/sorting.
const projects = defineCollection({
  loader: glob({ pattern: "*.md", base: "./content/projects" }),
  schema: z.object({
    number: z.number().int().positive(),
    // URL-safe slug = entry id, URL key, and `status` reference key. Keep stable.
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    name: z.string().min(1),
    architects: z.array(z.string().min(1)).nonempty(),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    completedYear: z.number().int().gt(1900),
    municipality: z.string().min(1),
    use: z.enum(["公共施設", "集合住宅", "学校", "公園", "橋梁", "駅", "その他"]),
  }),
});

// KAP'92 selected existing buildings (not commissioned new builds). One Markdown
// file per building, named by number. The frontmatter `slug` is the entry id and
// URL key (/kap92/<slug>). `number` is the prefecture-list number (1-46), kept
// for display/sorting. Most metadata is optional since these range from
// historical structures to modern buildings.
const kap92 = defineCollection({
  loader: glob({ pattern: "*.md", base: "./content/kap92" }),
  // Field names mirror `projects`; types/requiredness differ (existing buildings
  // may lack an architect, coordinates, or a precise year).
  schema: z.object({
    number: z.number().int().positive(),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    name: z.string().min(1),
    architects: z.array(z.string().min(1)).optional(),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
    completedYear: z.number().int().positive().optional(), // a year (no .gt(1900): these can be historical)
    municipality: z.string().optional(),
    use: z.string().optional(), // free text, unlike projects' enum
  }),
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
