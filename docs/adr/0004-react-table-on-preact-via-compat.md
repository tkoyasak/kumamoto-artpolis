# The table island runs @tanstack/react-table on Preact via compat

The explorer table uses `@tanstack/react-table`, but the islands run on Preact,
not React: `react` and `react-dom` are aliased to `@preact/compat` (the
`package.json` `overrides` plus `preact({ compat: true })` in the Astro config).
This reuses the mature react-table library while shipping Preact's much smaller
runtime to the client.

The island was first built on React and switched to Preact once compat proved to
work with react-table.
