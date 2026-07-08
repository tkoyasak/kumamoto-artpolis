# The table island runs @tanstack/react-table on Preact via compat

## Status

Accepted (2026-07-03).

## Context

The home table needs sorting, filtering, and search; `@tanstack/react-table`
is the mature TanStack Table adapter. The island was first built on React,
whose client runtime is an order of magnitude larger than Preact's
(~58 KB vs ~10 KB gzipped) — a heavy price for one table. The native
alternatives were not viable: `@tanstack/preact-table` exists only as a v9
beta, and a Qwik island was blocked by a version mismatch
(`@qwik.dev/astro` is Qwik v2 beta, `@tanstack/qwik-table` is v1).

## Decision

The islands run on Preact, not React: `react` and `react-dom` are aliased to
`@preact/compat` (the `package.json` `overrides` plus
`preact({ compat: true })` in the Astro config), and `@tanstack/react-table`
runs on top of the compat layer. The switch was made once compat proved to
work with react-table.

## Consequences

- The mature react-table library is reused while the client ships Preact's
  much smaller runtime.
- The aliasing is a maintenance cost: the `package.json` `overrides` must be
  kept in place (it makes SSR-externalized react-table resolve
  `@preact/compat` instead of real React), and react-table upgrades can hit
  `@preact/compat` incompatibilities — compat is a re-implementation of
  React's API, not React.
- Table components are authored against Preact (`preact/hooks`,
  `jsxImportSource: "preact"`), even though the table library speaks React.
