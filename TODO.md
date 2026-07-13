# TODO

- Add a GitHub Actions CI workflow running `bun run check` / `bun run test` /
  `bun run e2e` on push and PRs — full implementation plan in
  [#49](https://github.com/tkoyasak/kumamoto-artpolis/issues/49) (dependabot
  PRs are currently verified by nothing).
- KAP'92 entry list (not yet imported):
  - 日本語 https://www.pref.kumamoto.jp/soshiki/115/4477.html
  - 英語 なし
- Projects catalog gaps (ADR 0016 — the entries are hand-curated, so these are
  hand work):
  - 4 official rows uncatalogued, their pages carrying no building data: #64
    南小国町営杉田/矢津田団地 (one 建築データ record covers both, and GSI can
    geocode neither 中杉田 nor 矢津田), #87 和水町立菊水小中併設校舎, #121
    相良村交流拠点, #122 御船町拠点整備.
  - Nothing watches the prefecture's list page any more, so new official
    numbers surface only on a look: <https://www.pref.kumamoto.jp/soshiki/115/83273.html>.
  - #82 菊池市街地ポケットパーク is really two parks (切明 隈府495-1 / 横町
    隈府167-17) under one number; it is catalogued as one entry placed at the
    大字 they share. Split it into two entries if the pair should be visitable
    separately.
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
- Catalog data-entry tooling: the Projects side has `bun run check-projects`
  (read-only, ADR 0016); the KAP'92 entries (46 works) and a visit-record
  scaffold (`bun run new-entry`) are still hand work.
- Table filtering by municipality/use once the catalog grows — tanstack
  table is already in the bundle (`getFilteredRowModel`).
