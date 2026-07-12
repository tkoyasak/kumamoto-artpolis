# The detail tables are islands too, not a hand-written script

Decided 2026-07-12.

## Context

The home and `/status` tables are Preact islands (`SortableTable`): hover state,
ClientRouter navigation, and the map-mirrored outline all fall out of the render,
driven by `useStore($hovered)` and JSX handlers. The single-row detail tables and
the entry pages' visit lists rendered the same `TableView.tsx` markup with _no_
client directive, and a hand-written vanilla script in `DetailTable.astro`
re-attached the behaviors: a `bindRows` that wired `mouseenter`/`mouseleave`/
`click` on every swap, and an `applyRowHighlight` subscribed to `$hovered` that
toggled the `outline` class.

That script was a procedural re-implementation of what `SortableTable` expresses
declaratively — the same hover, the same `isRowHighlighted`, the same
`navigateWithRowMorph` — plus the bookkeeping a non-island needs: re-binding fresh
DOM on `astro:page-load` and re-seeding the outline because a static row can't
re-render. Its one justification was shipping zero JS on detail pages — but those
pages already run the vanilla maplibre island script, so "zero JS" was never
actually true there.

## Decision

The detail tables hydrate too: `DetailTable.astro` renders `DetailTableView` as
its own `client:load` island. Hover, clicks (including the modified-click deferral
and the subject row's plain `navigate` back), and the outline are the island's own
JSX and `useStore($hovered)`, exactly as `SortableTable` does them minus sorting.

The script shrinks to the one thing an island cannot own: the `astro:before-swap`
handler that names the destination row on the _incoming_ document
(`event.newDocument`) so a return navigation morphs back into its slot. A live
component can't reach the not-yet-swapped document, and the incoming island
hydrates only after the swap — too late for the transition snapshot — so this
stays a document-level listener.

## Consequences

- The static-HTML-plus-script shape is rejected, and with it the hand bookkeeping:
  no `bindRows`, no `astro:page-load` re-bind, no manual `$hovered.subscribe`. The
  row behaviors now live in one place — `TableView` plus the two islands — instead
  of being written once declaratively and once by hand.
- The cost: detail and `/status/<id>` pages now ship the Preact runtime (ADR 0002,
  ~10 KB gzipped) to hydrate near-static content — one subject row, a short visit
  list. The `TableView` chunk is already shared with `SortableTable`; the runtime
  is the new weight.
- The row morph is unaffected. Both tables already rendered the identical
  `TableView` markup (ADR 0006); hydration only changes _when_ the island wakes,
  and the transition snapshot is taken at swap time — before the incoming island
  hydrates — off the server-rendered HTML, whose subject row already carries its
  `view-transition-name` as an inline style.
- The bind-only row attributes (`data-row-nav`, `data-row-subject`,
  `data-row-back`, `data-marker-href`) are gone; only `data-row-href` and
  `data-row-flourish` remain, since the `before-swap` handler and the e2e suite
  read them off the incoming/rendered DOM.
- `astro:transitions/client` stays out of `TableView.tsx`: the subject row's plain
  `navigate` is re-exported through `row-morph.ts`, keeping the one client-only
  import in the module that already owns `navigateWithRowMorph`.
