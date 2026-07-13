# TODO

- Add a GitHub Actions CI workflow running `bun run check` / `bun run test` /
  `bun run e2e` on push and PRs — full implementation plan in
  [#49](https://github.com/tkoyasak/kumamoto-artpolis/issues/49) (dependabot
  PRs are currently verified by nothing).
- KAP'92 entry list (not yet imported):
  - 日本語 https://www.pref.kumamoto.jp/soshiki/115/4477.html
  - 英語 なし
- Projects sync leftovers (ADR 0013):
  - 4 rows still uncatalogued for lack of a groundable location — create the
    `NNNN-<slug>.md` stub, research the values, and fill via the sync tool
    plus hand edits: #64 南小国町営杉田/矢津田団地, #87 和水町立菊水小中併設
    校舎, #121 相良村交流拠点, #122 御船町拠点整備.
  - Coordinate precision — GSI geocoding stops at 大字 centroids, so entries
    in the same 大字 stack on one marker (新地団地A–E, the four 西原村小森
    homes, …). Pin the visible offenders to their real spots by editing the
    entries.
- The home layout doesn't survive the 127-row table: the transparent table
  overlay covers every map marker at desktop widths, so markers are visible
  but unclickable (the marker-click e2e is `fixme`). Needs a layout
  decision — capped table height, collapse, filtering, or similar.

Ideas (from the 2026-07-13 advisor audit,
[#53](https://github.com/tkoyasak/kumamoto-artpolis/issues/53)), in no
particular order:

- Photo pipeline: the planned R2 bucket
  (`docs/agents/content-model.md`) — bucket + URL convention, upload
  workflow, image sizing.
- Catalog data-entry tooling: Projects side now exists as
  `bun run sync-projects` (ADR 0013); a KAP'92 importer (46 works) and a
  visit-record scaffold (`bun run new-entry`) remain.
- Table filtering by municipality/use once the catalog grows — tanstack
  table is already in the bundle (`getFilteredRowModel`).
