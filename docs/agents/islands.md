# Islands (table & map)

`src/pages/index.astro` merges both collections into `EntryRow[]`
(`src/lib/entries.ts`) and renders two independent islands:

- **`EntriesTable.tsx`** — Preact + `@tanstack/react-table`, `client:load`;
  react-table runs on Preact via `@preact/compat`.
- **`EntriesMap.astro`** — plain client-side script (no framework);
  maplibre + `/map-markers.json` load lazily when the map first shows.
  → `docs/issues/0001`

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
  (`src/lib/stores.ts`), keyed by `href`. `.marker-active`
  (`src/styles/global.css`) does the highlight — maplibre owns the marker
  root's `transform`, so the scale applies to the inner `svg`.
