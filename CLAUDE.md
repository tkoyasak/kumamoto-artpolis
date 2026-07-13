# CLAUDE.md

Guidance for Claude Code working in this repo.

A static site cataloging Kumamoto Artpolis architecture and visits to it.
Astro SSG (every page prerendered) on Cloudflare Workers static assets. The
home page pairs a Preact table island with a vanilla maplibre island, linked
by hover state.

## Rules you won't think to look up

- Use **bun**, never npm/npx/bunx. Tools come from the Nix flake devShell via direnv.
- `src/content/README.md` is generated — don't hand-edit; `bun run content`.
- English for code comments, repo docs, commits, and PRs; Japanese for site
  content (`src/content/` bodies) and data values (entry names, `use`).
- Don't format/lint before committing; `oxfmt`/`oxlint` run as pre-commit hooks.
- **The filename is the entry id** (`NNNN-<slug>`, prefix == `number`) — it's
  the URL and how `status` references entries; keep filenames stable.
- **`status` is the source of truth for visit dates** — entries never store
  their own.
- **Entry frontmatter is data, the body is human prose** — the sync tool
  (`bun run sync-projects`) fills missing frontmatter and reports drift, but
  never overwrites values or touches bodies.

## Docs index

Everything else lives one pointer away:

- [`docs/agents/glossary.md`](docs/agents/glossary.md) — domain glossary; the source for terms (Entry, Project, KAP'92 building, Id, Visit record, …).
- [`docs/agents/commands.md`](docs/agents/commands.md) — commands, toolchain, and the unit/e2e test conventions.
- [`docs/agents/content-model.md`](docs/agents/content-model.md) — the three content collections, their schema, and the two id/visit-date facts in full.
- [`docs/agents/routing.md`](docs/agents/routing.md) — the page inventory.
- [`docs/agents/islands.md`](docs/agents/islands.md) — the table and map islands and the hover-state seam linking them (sorting + row-morph, map persistence + detail clip-crop, the subjecthood ring).
- **`docs/adr/`** — the immutable decision log: _why_ the code is shaped this way.
- **`docs/findings/`** — immutable empirical findings: benchmarks, browser behavior.
