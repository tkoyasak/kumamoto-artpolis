import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { defineCollection, reference } from "astro:content";

// Both catalog collections share one schema. The Markdown filename is the
// entry id (ADR 0002) — keep filenames stable; `number` is display/sort only.
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
// references exactly one visited entry (ADR 0003); the body holds the visit's
// notes and photos (public R2 URLs).
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
