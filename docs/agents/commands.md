# Commands & toolchain

Use **bun**, never npm/npx/bunx. Tools (`bun`, `oxfmt`, `oxlint`,
`typescript-go`) come from the Nix flake devShell via direnv; `wrangler` is a
bun devDependency.

- `bun run dev` — dev server
- `bun run build` — production build to `dist/`
- `bun run preview` — serve `dist/` (what the e2e suite runs against)
- `bun run check` — `astro check` (TypeScript + content schema; the only type check)
- `bun run test` — `vitest run` (invariant tests; see below)
- `bun run e2e` — Playwright (see below)
- `bun run geocode <address>...` — print the coordinates for a 所在地 and stop; you paste them into the entry (see content-model.md)
- `bun run deploy` — build + `wrangler deploy --strict`. A push to `main` runs
  this automatically from the CI workflow's `deploy` job once `verify`
  (check/test/e2e) is green; run it by hand only for an out-of-band deploy
  (docs/adr/0015).
- `bun run clean` — remove Astro caches, the Vite dep-optimizer cache
  (`node_modules/.vite`), and `dist/`. Clearing `.vite` is the fix for a dev
  server serving `504 Outdated Optimize Dep` (stale pre-bundle → islands stop
  hydrating); pair it with `astro dev stop` and a browser hard-reload.

`oxfmt` (formatting incl. Markdown; sorts imports + Tailwind classes) and
`oxlint` run via pre-commit hooks — don't format/lint manually before a
commit.

Toolchain gotchas:

- Neither oxfmt nor oxlint parses `.astro`; oxfmt covers everything else here
  ([language support](https://oxc.rs/docs/guide/usage/formatter/language-support.html)),
  oxlint only `.ts`/`.tsx`.
- In `scripts/`, prefer Bun-native APIs over node builtins.

## Unit tests (`bun run test`)

Vitest through Astro's `getViteConfig()`. Tests pin invariants, with the
_why_ in the test name.

Placement, in order of preference:

1. **In-source** (`import.meta.vitest`) inside the very module they pin.
   Production bundles carry none of it: `astro.config.ts` defines
   `import.meta.vitest` away (`define: { "import.meta.vitest": "undefined" }`).
2. **Colocated `*.test.ts`** for behaviors needing counterfactual fixtures
   (id collisions, dangling references) — these `vi.mock`
   `astro:content` per file. Under `getViteConfig` the `astro:content`
   virtual module otherwise resolves for real.
3. **`tests/`** for cross-file or route-constrained tests — `src/pages`
   can't hold one; a test file there would become a route.

## E2E (`bun run e2e`)

Playwright suite in `e2e/` (excluded from Vitest), run against the
production build via `astro preview`. System Chrome
(`channel: "chrome"`, no downloaded browsers), carto style URL mocked,
expected rows/markers read off the `src/content/` entry filenames (the same
source the site builds from).
