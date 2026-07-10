# Islands (tables & map)

`src/pages/index.astro` merges both collections into `EntryRow[]`
(`src/lib/entries.ts`) and renders two independent islands:

- **`EntriesTable.tsx`** — Preact + `@tanstack/react-table`, `client:load`;
  react-table runs on Preact via `@preact/compat`.
- **`EntriesMap.astro`** — plain client-side script (no framework);
  maplibre + `/map-markers.json` load lazily when the map first shows.
  → `docs/issues/0001`

`/status` renders a third island, **`StatusTable.tsx`** (the sortable visit
timeline). Both table islands are thin column definitions over
**`SortableTable.tsx`**, which owns the sorting UI and the row behaviors
(hover state, ClientRouter navigation, row-morph hooks). Every column sorts;
each table loads sorted by its first column descending — the same order the
server renders, so nothing shifts on hydration. The single-row tables on
detail pages and the entry pages' visit lists stay static
(`DetailTable.astro`).

All tables — island and static — render their markup through
**`TableView.tsx`**, the single source of the shared structure and classes;
the static side renders it with no client directive (plain HTML, zero JS),
which is what keeps both sides of a row morph identical by construction.

Constants shared between the layout, the map script, and CSS (layer id,
fullscreen paths, marker colors) live in `src/lib/map.ts`; the marker colors
are pinned against `global.css` by `tests/css-contract.test.ts`.

Operational gotchas:

- The map layer lives in `Base.astro` under `transition:persist` (survives
  navigation). It is fullscreen only on `FULLSCREEN_MAP_PATHS` (`/` and
  `/status`) and hidden server-side elsewhere. → `docs/issues/0002`
- Row clicks must navigate through the ClientRouter
  (`navigateWithRowMorph`, `src/lib/row-morph.ts`) — `window.location` would
  full-reload and rebuild the persisted map. The same helper tags the clicked
  row with a view-transition name so it morphs into its detail-page
  counterpart. → `docs/issues/0003`
- Detail pages don't move the camera: the script `clip-path`-crops the
  fullscreen layer to a square around the marker, shows only that entry's
  marker, and clicking it returns home. (`mapFocus` → `Base.astro` →
  `<body>` data attributes.)
- Islands share hover state via the nanostores atom `$hovered`
  (`src/lib/stores.ts`): `marker` carries the map marker key (an entry href —
  for a status row, its _visited entry's_), `row` the hovering row's own href.
  Rows highlight via `isRowHighlighted`, so hovering one visit of an entry
  doesn't light up its sibling visits, while hovering the marker lights them
  all. The static detail rows join the same linkage: `DetailTable.astro`
  subscribes to `$hovered` and toggles the outline through `isRowHighlighted`
  (marker key defaulting to the row's own href), so the `/status/<id>` entry
  row and its marker light each other exactly like the home table. `.marker-active`
  (`src/styles/global.css`) does the highlight — maplibre owns the marker
  root's `transform`, so the scale applies to the inner `svg`. The ring means
  "this entry is the subject", so `isMarkerOutlined` suppresses it in /status
  contexts where the marker is mere context: a visit-row hover, or a
  `/status/<id>` page at rest (a direct hover of that marker still rings it).
  The detail-page clip is unaffected. → `docs/adr/0007`
