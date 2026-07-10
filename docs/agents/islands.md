# Islands (tables & map)

`src/pages/index.astro` renders the Preact table island over the layout's
persisted map layer; `getEntryRows()` (`src/lib/entries.ts`) merges both
collections into the rows. The two islands are independent, linked only by
shared hover state. → `docs/adr/0005`

## Tables

- **`EntriesTable.tsx`** (home catalog) and **`StatusTable.tsx`** (`/status`
  visit timeline) are thin column definitions over **`SortableTable.tsx`**,
  which owns the tanstack sorting UI and the row behaviors (hover state,
  ClientRouter navigation, row-morph hooks). react-table runs on Preact via
  `@preact/compat`. → `docs/adr/0004`
- Every column sorts; each table loads sorted by its first column descending —
  the order the server renders, so nothing shifts on hydration (`initialSorting`).
- The single-row detail-page tables and the entry pages' visit lists are
  static: `EntryDetailTable.astro` / `StatusDetailTable.astro` (the
  per-collection column defs) render through **`DetailTable.astro`**, the
  shared static host that carries the row script.
- All tables — island and static — render through **`TableView.tsx`**, the
  single source of the shared markup and classes; the static side renders it
  with no client directive (plain HTML, zero JS). That identity by construction
  keeps both sides of a row morph pixel-matched. → `docs/issues/0003`

## Map

- **`EntriesMap.astro`** is a plain client script (no framework); maplibre and
  `/map-markers.json` load lazily when the map first shows. → `docs/issues/0001`
- The layer lives in `Base.astro` under `transition:persist` (survives
  navigation). It is fullscreen only on `FULLSCREEN_MAP_PATHS` (`/` and
  `/status`) and hidden server-side elsewhere. → `docs/issues/0002`
- The camera never moves: a detail page keeps the layer put and `clip-path`-
  crops it to a `FOCUS_CLIP_SIZE`px square around the focused marker, shows only
  that marker, and clicking it returns home. Focus coords + marker href ride on
  `<body>` data attributes (`mapFocus` → `Base.astro`). → `docs/adr/0008`
- Constants shared between the layout, the map script, and CSS (layer id,
  fullscreen paths, marker colors) live in `src/lib/map.ts`; the marker colors
  are pinned against `global.css` by `tests/css-contract.test.ts`.

## Linkage (the seam)

- Islands share hover state via the nanostores atom `$hovered`
  (`src/lib/stores.ts`): `marker` carries the map marker key (an entry href —
  for a status row, its _visited entry's_), `row` the hovering row's own href.
  → `docs/adr/0005`
- Rows highlight via `isRowHighlighted`, so hovering one visit of an entry
  doesn't light its sibling visits, while hovering the marker lights them all.
  The static detail rows join the same linkage: `DetailTable.astro` subscribes
  to `$hovered` and toggles the outline through `isRowHighlighted` (marker key
  defaulting to the row's own href).
- A marker draws its outline ring only when the entry is the _subject_ of the
  interaction; `isMarkerOutlined` gates it over (hover source × page context).
  → `docs/adr/0007`
- The ring is an `outline` on the inner `.map-marker-dot` in the collection
  color; `.marker-active` (`src/styles/global.css`), toggled on the marker root,
  applies it and raises the marker's `z-index`.
- Hover state has to survive a client swap, and two swap behaviors fight it —
  `syncVisibility` re-seeds from the persisted markers, `pendingPath` bridges
  the in-flight ring. → `docs/issues/0002`
