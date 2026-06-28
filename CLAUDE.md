# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static site documenting visits to Kumamoto Artpolis architecture. Astro SSG (every page prerendered) deployed to Cloudflare Workers static assets. The home page is an interactive "explorer": a filterable/sortable table (Preact island) beside a map (vanilla maplibre island), the two linked by hover state.

## Commands

Use **bun**, never npm. Tools (`bun`, `oxfmt`, `oxlint`, `wrangler`, `typescript-go`) come from the Nix flake devShell via direnv — don't fetch them with `bunx`/`npx`.

- `bun run dev` — Astro dev server
- `bun run build` — production build to `dist/`
- `bun run check` — `astro check` (TypeScript + content schema validation; the only type check)
- `bun run content` — regenerate `content/README.md` from the collections (also runs as a pre-commit hook on `content/*.md` changes)
- `bun run deploy` — build + `wrangler deploy`
- `bun run clean` — remove Astro caches and `dist/`

There is no test suite. `oxfmt` (formatting, incl. Markdown) and `oxlint` (linting) run via the pre-commit hooks; `oxfmt` sorts imports and Tailwind classes.

## Content model (`src/content.config.ts`)

Three Astro content collections under `content/`, all loaded from Markdown via the glob loader:

- **`projects/`** — Artpolis commissioned new builds. Files are numbered (`1.md`); strict schema (enum `use`, required coordinates/architect/year).
- **`kap92/`** — KAP'92 selected _existing_ buildings. Same field names as `projects` but most are optional (these range from historical structures to modern buildings; `use` is free text).
- **`status/`** — one file per visit date (`2025-11-03.md`). Frontmatter `projects` is an array of `reference("projects")`. **This is the source of truth for visit dates** — projects don't store their own visit dates.

### The slug indirection (important)

For `projects` and `kap92`, the frontmatter **`slug` field is the entry id** — the glob loader is configured so that a `slug` field becomes the id. So:

- the file is named by `number` (`1.md`), but the URL is `/projects/<slug>` and the entry id is the slug;
- code reads `entry.data.slug` explicitly (it equals `entry.id`);
- `status` references projects **by slug**, and `getVisitDatesByProject()` (`src/lib/projects.ts`) keys its result map by slug.

`number` is the official Artpolis / prefecture-list number, used only for display and sorting. Keep slugs stable — they're the public URL and the cross-collection reference key.

## Routing

- `/` — explorer (table + map) of all projects and KAP'92 buildings
- `/projects/<slug>`, `/kap92/<slug>` — one prerendered detail page per entry (`getStaticPaths`)
- `/status` — visit timeline (newest first); `/status/<date>` — one day's record
- `/about`

## Island architecture (home page)

`src/pages/index.astro` builds a unified `ExplorerRow[]` (`src/lib/explorer.ts`) merging both collections, attaching latest visit date from `getVisitDatesByProject()`, then renders two independent islands:

- **`ProjectsTable.tsx`** — Preact + `@tanstack/react-table`, hydrated `client:load`. React-table libraries run on Preact via `@preact/compat` (see `astro.config.ts` `preact({ compat: true })` and the `react`/`react-dom` overrides in `package.json`).
- **`ProjectsMap.astro`** — a plain client-side `<script>` (no framework), statically importing maplibre so it never waits for the Preact island to hydrate. maplibre (~1 MB) is code-split into its own cacheable chunk via `manualChunks` (`astro.config.ts`) and loaded at natural priority — deliberately _not_ head-preloaded (benchmarked; see `issues/maplibre-chunk-loading.md`). Map data is passed as an inline JSON `<script>` element, not props.

The two islands share **hover state** through a nanostores atom `$hovered` (`src/lib/stores.ts`), keyed by each row's `href`. Hovering a table row highlights its marker and vice versa. The CSS class `.marker-active` (`src/styles/global.css`) does the highlight — note maplibre owns the marker root's `transform`, so the scale effect is applied to the inner `svg`.

## content/README.md is generated

`content/README.md` is produced by `scripts/content-readme.ts` (a Bun script — uses `Bun.Glob`, `Bun.file`, `Bun.YAML`, `Bun.$`) and formatted with oxfmt. **Don't edit it by hand**; edit the script or the content files and run `bun run content`. The pre-commit hook regenerates it automatically when content Markdown changes.

## Notes

- Write all code comments in English (chat/commits may be Japanese).
- TypeScript uses `astro/tsconfigs/strictest`. Photos are referenced as public R2 URLs in Markdown bodies (bucket not yet set up — see `TODO.md`).
- Notable design/perf decisions get a write-up under `issues/` (rationale, methodology, conclusion); `TODO.md` tracks pending work.
