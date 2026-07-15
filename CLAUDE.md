# CLAUDE.md

Guidance for Claude Code working in this repo.

A static site cataloging Kumamoto Artpolis architecture and visits to it.
Astro SSG (every page prerendered) on Cloudflare Workers static assets. The
home page pairs a Preact table island with a vanilla maplibre island, linked
by hover state.

## Rules you won't think to look up

- Use **bun**, never npm/npx/bunx. Tools come from the Nix flake devShell via direnv.
- English for code comments, repo docs, commits, and PRs; Japanese for site
  content (visit-record bodies) and data values (entry names, `use`).
- Don't format/lint before committing; `oxfmt`/`oxlint` run as pre-commit hooks.
- **The catalog is hand-written Markdown** — one file per entry under
  `src/content/projects/` and `src/content/kap92/`, read by Astro's glob loader;
  no data module, no generation step. Excluded official rows live in
  `src/content/projects/_excluded/`.
- **The filename is the id and it is the URL** — a stable slug carrying no
  number; `number` is display/sort only, and entries may share one. An entry's
  links go in its Markdown body, not the frontmatter.
- **`status` is the source of truth for visit dates** — entries never store
  their own.
- **The entries are hand-curated; no tool writes them, and nothing checks them
  against the prefecture's pages.**

## Docs index

Everything else lives one pointer away:

- [`docs/agents/glossary.md`](docs/agents/glossary.md) — domain glossary; the source for terms (Entry, Project, KAP'92 building, Id, Visit record, …).
- [`docs/agents/commands.md`](docs/agents/commands.md) — commands, toolchain, and the unit/e2e test conventions.
- [`docs/agents/content-model.md`](docs/agents/content-model.md) — the typed catalog, the visit records, their schema, and the id/visit-date facts in full.
- [`docs/agents/routing.md`](docs/agents/routing.md) — the page inventory.
- [`docs/agents/islands.md`](docs/agents/islands.md) — the table and map islands and the hover-state seam linking them (sorting + row-morph, map persistence + detail clip-crop, the subjecthood ring).
- **`docs/adr/`** — the immutable decision log: _why_ the code is shaped this way.
- **`docs/findings/`** — immutable empirical findings: benchmarks, browser behavior.
