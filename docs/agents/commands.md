# Commands & toolchain

Use **bun**, never npm/npx/bunx. Tools (`bun`, `oxfmt`, `oxlint`, `wrangler`,
`typescript-go`) come from the Nix flake devShell via direnv.

- `bun run dev` — dev server
- `bun run build` — production build to `dist/`
- `bun run check` — `astro check` (TypeScript + content schema; the only type check)
- `bun run test` — `vitest run` (invariant tests; see below)
- `bun run e2e` — Playwright (see below)
- `bun run content` — regenerate `src/content/README.md` (also a pre-commit hook on `src/content/*.md`)
- `bun run deploy` — build + `wrangler deploy`
- `bun run clean` — remove Astro caches and `dist/`

`oxfmt` (formatting incl. Markdown; sorts imports + Tailwind classes) and
`oxlint` run via pre-commit hooks — don't format/lint manually before a
commit.

## Unit tests (`bun run test`)

Vitest through Astro's `getViteConfig()`. Tests pin invariants, with the
_why_ in the test name (→ `docs/adr/0006`).

Placement, in order of preference:

1. **In-source** (`import.meta.vitest`) inside the very module they pin.
   Production bundles carry none of it: `astro.config.ts` defines
   `import.meta.vitest` away (`define: { "import.meta.vitest": "undefined" }`).
2. **Colocated `*.test.ts`** for behaviors needing counterfactual fixtures
   (id collisions, XOR violations, dangling references) — these `vi.mock`
   `astro:content` per file. Under `getViteConfig` the `astro:content`
   virtual module otherwise resolves for real.
3. **`tests/`** for cross-file or route-constrained tests — `src/pages`
   can't hold one; a test file there would become a route.

## E2E (`bun run e2e`)

Playwright suite in `e2e/` (excluded from Vitest), run against the
production build via `astro preview`. System Chrome
(`channel: "chrome"`, no downloaded browsers), carto style URL mocked,
expected rows/markers derived from content filenames.
