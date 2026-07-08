# CLAUDE.md

Guidance for Claude Code working in this repo.

A static site cataloging Kumamoto Artpolis architecture and visits to it.
Astro SSG (every page prerendered) on Cloudflare Workers static assets. The
home page pairs a Preact table island with a vanilla maplibre island, linked
by hover state.

## Rules you won't think to look up

- Use **bun**, never npm/npx/bunx. Tools come from the Nix flake devShell via direnv.
- `src/content/README.md` is generated — don't hand-edit; `bun run content`.
- Write code comments in English (chat/commits may be Japanese).
- Don't format/lint before committing; `oxfmt`/`oxlint` run as pre-commit hooks.
- **The filename is the entry id** — it's the URL and how `status` references
  entries; keep filenames stable. → `docs/adr/0002`
- **`status` is the source of truth for visit dates** — entries never store
  their own. → `docs/adr/0003`

## Docs index

Everything else lives one pointer away (→ `docs/adr/0006` for the placement
rules):

- [`docs/agents/glossary.md`](docs/agents/glossary.md) — domain glossary; the source for terms (Entry, Project, KAP'92 building, Id, Visit record, …).
- [`docs/agents/commands.md`](docs/agents/commands.md) — commands, toolchain, and the unit/e2e test conventions.
- [`docs/agents/content-model.md`](docs/agents/content-model.md) — the three content collections, their schema, and the two id/visit-date facts in full.
- [`docs/agents/routing.md`](docs/agents/routing.md) — the page inventory.
- [`docs/agents/islands.md`](docs/agents/islands.md) — the two home-page islands and their operational gotchas (map persistence, hover state, marker highlight).
- **`docs/adr/`** — short ADRs recording _why_ the code is shaped this way.
- **`docs/issues/`** — deep perf/UX write-ups (rationale, methodology, benchmarks).
