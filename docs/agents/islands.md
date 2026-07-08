# Islands (home page)

`src/pages/index.astro` merges both collections into `EntryRow[]`
(`src/lib/entries.ts`) and renders two independent islands (→ `docs/adr/0005`):

- **`EntriesTable.tsx`** — Preact + `@tanstack/react-table`, `client:load`;
  react-table runs on Preact via `@preact/compat`. → `docs/adr/0004`
- **`EntriesMap.astro`** — plain client-side script (no framework);
  maplibre + `/map-markers.json` load lazily when the map first shows.
  → `docs/issues/0001-maplibre-chunk-loading.md`

Operational gotchas:

- The map layer lives in `Base.astro` under `transition:persist` (survives
  navigation) and is hidden server-side off the home page.
  → `docs/issues/0002-map-persist-across-navigation.md`
- Detail pages don't move the camera: the script `clip-path`-crops the
  fullscreen layer to a square around the marker, shows only that entry's
  marker, and clicking it returns home. (`mapFocus` → `Base.astro` →
  `<body>` data attributes.)
- Islands share hover state via the nanostores atom `$hovered`
  (`src/lib/stores.ts`), keyed by `href`. `.marker-active`
  (`src/styles/global.css`) does the highlight — maplibre owns the marker
  root's `transform`, so the scale applies to the inner `svg`.
