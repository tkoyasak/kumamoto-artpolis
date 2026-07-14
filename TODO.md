# TODO

- Add a GitHub Actions CI workflow running `bun run check` / `bun run test` /
  `bun run e2e` on push and PRs — full implementation plan in
  [#49](https://github.com/tkoyasak/kumamoto-artpolis/issues/49) (dependabot
  PRs are currently verified by nothing).

Ideas (from the 2026-07-13 advisor audit,
[#53](https://github.com/tkoyasak/kumamoto-artpolis/issues/53)), in no
particular order:

- Photo pipeline: the planned R2 bucket
  (`docs/agents/content-model.md`) — bucket + URL convention, upload
  workflow, image sizing. Status bodies still hold `media.example.com`
  placeholders.
- Catalog data-entry tooling: a scaffold script (`bun run new-entry`) or an
  importer from the prefecture list pages (URLs already in
  `scripts/content-readme.ts`) — the program exceeds 100 works, KAP'92 lists
  46, the catalog holds 5.
- Table filtering by municipality/use once the catalog grows — tanstack
  table is already in the bundle (`getFilteredRowModel`).
