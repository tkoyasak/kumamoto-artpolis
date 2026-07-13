# Projects are imported from the prefecture list via a committed importer

Decided 2026-07-13.

## Context

The `projects` collection held 4 hand-written sample entries with dummy data
while the official Kumamoto Artpolis list
(<https://www.pref.kumamoto.jp/soshiki/115/83273.html>) catalogs 122 numbered
projects. Populating the collection meant deciding what counts as an entry,
where each schema field comes from, how ids are assigned, and whether the
import is a one-off or a maintained tool. The list rows vary widely: some
bundle several buildings across municipalities under one number
(HOME-FOR-ALL groups), some are studies or design concepts that were never
built, and the newest rows lack completion dates and English names.

## Decision

A committed importer (`bun run import-projects`,
`scripts/import-projects.ts`) generates `src/content/projects/` from the
prefecture pages, driven by a reviewed registry
(`scripts/data/projects-registry.json`) that permanently assigns
number → id. The importer never overwrites an existing entry file, so it can
be re-run when the prefecture appends numbers or after filling registry
overrides for rows it reported as skipped.

- **Entry granularity**: one entry per physical, visitable work. Rows with no
  built work (studies, concepts, manuals — #13/15/18/24/28/30) are excluded
  in the registry; multi-building rows are split one entry per building
  (`splits`), sharing the official `number` (display-only per ADR 0008).
  Rows whose location can't be sourced are skipped and reported, not
  guessed.
- **Ids** are the official English list names slugified verbatim (typos
  corrected only where the user chose to); rows without a unique English
  name use the derived `home-for-all-in-<municipality>-<place>` pattern
  after the one official HOME-FOR-ALL English name.
- **Field sources**: `name` is the Japanese list wording, annotations
  included; `architects` is the designer credit as one unsplit string;
  `use` is the detail page's 主要用途; `completedYear` is the list's year;
  `lat`/`lng`/`municipality` come from geocoding the detail page's 所在地
  with the GSI address search (municipality keeps 政令市 wards). The
  registry's per-entry `overrides` pin any of these when pages lack them.
- **Bodies** are official links only (detail page, JA/EN PDFs) — the
  prefecture's prose is copyrighted and is not copied.
- All sample content (projects, kap92, status) was deleted rather than
  reconciled; the samples' data was dummy and one id (`hozukubo`) was a
  misromanization.

## Consequences

- The registry, not the importer, owns id stability: re-runs cannot mint new
  ids for existing numbers, and review happens once, in the registry diff.
- Geocoding resolves to 大字/丁目 centroids (GSI has no banchi precision), so
  entries in the same 大字 share coordinates and stack on the map; outliers
  are pinned by hand via `overrides` using the printed geocode report. A
  bbox test (`tests/catalog-coordinates.test.ts`) keeps every coordinate
  inside Kumamoto Prefecture.
- #64 (杉田/矢津田団地), #87, #121, #122 stay unimported until a groundable
  location exists; they are the re-run backlog, tracked in TODO.md.
- The 127-entry table outgrew the home layout: the transparent table overlay
  now covers every map marker at desktop widths, so markers are visible but
  not clickable (the marker-click e2e is `fixme` until the layout adapts).
