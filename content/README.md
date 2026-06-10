# content

Site content (Astro content collections). Schema: `src/content.config.ts`.

- `projects/` — one Markdown file per project, named by its Art Polis number (`1.md` → `/projects/1`). Frontmatter holds metadata, the body is the description.
- `status/` — one Markdown file per day, named by date (`2025-11-03.md` → `/status/2025-11-03`). Its frontmatter `projects` lists the projects visited that day; the body holds notes and photos.
