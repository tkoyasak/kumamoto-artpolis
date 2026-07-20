# Islands (tables & map)

`src/pages/index.astro` renders the Preact table island over the layout's
persisted map layer; `getEntryRows()` (`src/lib/entries.ts`) merges both
collections into the rows. The two islands are independent, linked only by
shared hover state (docs/adr/0003).

## Tables

- **`EntriesTable.tsx`** (home catalog) and **`StatusTable.tsx`** (`/status`
  visit timeline) are thin column definitions over **`SortableTable.tsx`**,
  which owns the tanstack sorting UI and the row behaviors (hover state,
  ClientRouter navigation, row-morph hooks). react-table runs on Preact via
  `@preact/compat` (docs/adr/0002).
- Every column sorts; each table loads sorted by its first column descending —
  the order the server renders, so nothing shifts on hydration (`initialSorting`).
- The single-row detail-page tables and the entry pages' visit lists are
  `EntryDetailTable.astro` / `StatusDetailTable.astro` (the per-collection
  column defs), rendering through **`DetailTable.astro`** — the shared host
  that wraps the detail island and carries the return-morph script.
- All tables render through **`TableView.tsx`**, the single source of the
  shared markup and classes; both the sortable island (`SortableTable`) and the
  detail island (`DetailTableView`) hydrate `client:load` (docs/adr/0011).

## Row morph

Clicking a row morphs it into the detail page's subject row and back, over the
ClientRouter's View Transition (docs/adr/0006; the transition's sharp edges are
docs/findings/0003).

- `src/lib/transitions.ts` holds the shared names — `ENTRY_HEAD_VT` for the
  header row (carried by every table) and `rowTransitionName(href)` for a row.
  It imports no `astro:content`, so the Preact islands can import it.
- `src/lib/row-morph.ts` is the client-only half: `navigateWithRowMorph(href)`
  names the row whose `data-row-href` matches, then `navigate()`s. Only the
  clicked row is ever named. It also re-exports the plain `navigate` the subject
  row uses to go back, keeping `astro:transitions/client` out of `TableView`.
- `DetailTableView` names its header and subject row from first render, as
  inline styles.
- The return trip is a document-level `astro:before-swap` listener in
  `DetailTable.astro` (an island can't reach the not-yet-swapped document): it
  names the incoming row for the page being left, adds the `outline` class so
  the snapshot carries it, drops that class off the live row on
  `viewTransition.ready`, and clears the temporary name on `finished`.
- Rows expose `data-row-href` (the morph and the e2e suite match on it),
  `data-row-marker` (the map's touch-select scrolls to it), and
  `data-row-flourish`.

## Map

- **`EntriesMap.astro`** is a plain client script (no framework); maplibre and
  `/map-markers.json` load lazily when the map first shows (docs/adr/0004,
  docs/findings/0001).
- The layer lives in `Base.astro` under `transition:persist` (survives
  navigation — docs/adr/0005, docs/findings/0002). It is fullscreen only on
  `FULLSCREEN_MAP_PATHS` (`/` and `/status`) and hidden server-side elsewhere.
- The camera never moves: a detail page keeps the layer put and `clip-path`-
  crops it to a `FOCUS_CLIP_SIZE`px square around the focused marker, shows only
  that marker, and clicking it returns home (docs/adr/0007). Focus coords +
  marker href ride on `<body>` data attributes (`mapFocus` → `Base.astro`).
- Constants shared between the layout, the map script, and CSS (layer id,
  fullscreen paths, marker colors) live in `src/lib/map.ts`; the marker colors
  are pinned against `global.css` by `tests/css-contract.test.ts`.

## Linkage (the seam)

- Islands share hover state via the nanostores atom `$hovered`
  (`src/lib/stores.ts`): `marker` carries the map marker key (an entry href —
  for a status row, its _visited entry's_), `row` the hovering row's own href.
- Rows highlight via `isRowHighlighted`, so hovering one visit of an entry
  doesn't light its sibling visits, while hovering the marker lights them all.
  The detail rows join the same linkage: `DetailTableView` reads `$hovered`
  (via `useStore`) and outlines through `isRowHighlighted`, the same as the
  sortable island (marker key defaulting to the row's own href).
- A marker draws its outline ring only when the entry is the _subject_ of the
  interaction; `isMarkerOutlined` gates it over (hover source × page context)
  (docs/adr/0010).
- The ring is an `outline` on the inner `.map-marker-dot` in the collection
  color; `.marker-active` (`src/styles/global.css`), toggled on the marker root,
  applies it and raises the marker's `z-index`.
- Hover state has to survive a client swap, and two swap behaviors fight it —
  `syncVisibility` re-seeds from the persisted markers, `pendingPath` bridges
  the in-flight ring (docs/findings/0004).

## Below sm

- The sortable islands render as a fixed bottom panel (`data-table-panel`,
  `TableView`'s `panel` prop): the map keeps the top 40svh as its interactive
  strip, the panel scrolls internally under a sticky background-less header —
  rows fade out as they slide under its band (a scroll-driven animation in
  `global.css`) — and the fullscreen-map pages have no page scroll
  (docs/adr/0014). The fade's authoring is pinned by docs/findings/0007,
  docs/findings/0008, and docs/findings/0009.
- Columns collapse to the `*_MOBILE_COLS` subset (`src/lib/table.ts`) — entry
  tables keep No./Name/Year, status keeps Date/Name — in the detail tables
  too, so the morph pair's shapes stay identical. A collapsed column keeps its
  cells in flow as invisible zero-width boxes (docs/findings/0005).
- The nav is one fixed horizontal bar on every page (`Base.astro`); the
  interleaved desktop links are `display:none` there.
- The map's initial camera opens centered on Kumamoto Castle at a fixed zoom,
  not fit to every marker (docs/adr/0016) — desktop and below sm alike. Below
  sm the panel-aware padding frames it into the 40svh strip (measured from the
  panel when present, derived from the viewport on pages without one); markers
  outside the frame start off-screen.
- On `(hover: none)` devices a marker's first tap takes the hover role — sets
  `$hovered`, rings the marker, scrolls the matching `data-row-marker` row
  into view — and a second tap navigates; a background tap clears. Every
  write that clears `$hovered` also disarms the two-tap latch. Marker
  elements stop `touchstart`/`touchend` propagation so taps never enter
  maplibre's gesture pipeline, and the background-click handler filters out
  clicks whose target is a marker (docs/findings/0006).
