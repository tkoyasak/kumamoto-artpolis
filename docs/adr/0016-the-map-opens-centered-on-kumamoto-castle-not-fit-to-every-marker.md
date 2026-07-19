# The map opens centered on Kumamoto Castle, not fit to every marker

Decided 2026-07-20.

## Context

The persisted map (ADR 0005) set its initial camera by fitting every marker:
desktop `fitBounds` over all markers padded 64px, and below `sm` the same fit
padded to reserve the strip so every marker started inside it (ADR 0014).

Fitting the whole catalog frames the entire prefecture, so the map opened
zoomed far out — the dense central cluster around Kumamoto City, where most
entries sit, was an unreadable knot, worst on a phone's narrow strip.

## Decision

The initial camera opens centered on Kumamoto Castle at a fixed zoom (11),
desktop and below `sm` alike, via `jumpTo` with the panel-aware `fitPadding`
(below `sm` the padding still reserves the strip; on desktop it is a uniform
64). Entries outside the frame start off-screen; panning or zooming out reaches
them. The per-marker bounds accumulation and `fitBounds` are gone. Center and
zoom are the two knobs, held as `INITIAL_CENTER` / `INITIAL_ZOOM`.

## Consequences

- Overturns ADR 0014's "the initial `fitBounds` pads its bottom by the panel
  height, so every marker starts inside the visible strip": below `sm`, edge
  markers now start off-screen and are untappable until panned into the strip.
  The rest of ADR 0014 (strip layout, two-tap select, column subset, nav bar)
  stands.
- Camera-never-moves (ADR 0007) is unchanged, now trivially: the camera is set
  once by `jumpTo` and detail pages still only crop. The e2e guard shifted from
  "every marker sits inside the strip" to "zoomed in past fit-all, and the
  persisted camera returns identical after a detail round-trip."
- `fitPadding` now always returns a `PaddingOptions` object (desktop
  `{64,64,64,64}`) so the one value feeds the single `jumpTo`.
- Rejected keeping `fitBounds` for performance: its cost is a one-time camera
  calc over bounds already built in the marker loop, dwarfed by style, tiles,
  and marker DOM — dropping it is a UX choice (open on the city), not a speedup.
- The trade-off: the map no longer shows the whole prefecture at a glance; it
  favors legibility of the center. Reaching a coastal or outlying entry needs a
  pan or a zoom-out. Accepted — the table is the catalog's index; the map only
  orients around the city where the work clusters.
