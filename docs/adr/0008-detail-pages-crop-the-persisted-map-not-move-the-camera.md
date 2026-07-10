# Detail pages crop the persisted map, they don't move the camera

## Status

Accepted (2026-07-11).

## Context

The maplibre layer is a single instance that lives in the layout and survives
navigation via `transition:persist`
([issue 0002](../issues/0002-map-persist-across-navigation.md)). Fullscreen
pages (`/`, `/status`) show every marker; a detail page
(`/projects/<id>`, `/kap92/<id>`, `/status/<id>`) is about one entry and needs
the map to point at that entry's marker.

The obvious way to focus a map is to move the camera — `fitBounds`/`flyTo` to
the marker on each detail page. But the camera is shared state on a persisted
instance: whatever a detail page does to it must be undone on the way back to
`/`, or the home map returns framed on the last entry instead of the whole
prefecture.

## Decision

Detail pages leave the camera untouched and `clip-path`-crop the fullscreen
layer to a `FOCUS_CLIP_SIZE`px square around the focused marker's projected
screen point. Only that marker is shown (the rest `display:none`), and clicking
it navigates home. The focus coordinates and marker href ride on `<body>` data
attributes (`mapFocus` → `Base.astro`), read by the map script's `applyClip`
(`EntriesMap.astro`).

## Consequences

- Moving the camera is rejected: it mutates shared persisted state that has to
  be identical on return to `/`, so it would animate on every navigation and
  need reconciling against the home `fitBounds`. Cropping never touches the
  camera, so returning home shows the same map with no re-fit.
- The crop is computed from `map.project(focus)`, so the initial `fitBounds`
  runs with `animate:false` (projection valid the moment init resolves), and
  the crop is recomputed on the map's `resize` event since a viewport change
  shifts the marker's on-screen point.
- `clip-path` also clips hit-testing, so the cropped-away area can't swallow a
  detail page's clicks — a property a camera move wouldn't give for free.
- The cost: a detail page frames the entry with a screen-space rectangle, not a
  real zoom — the surrounding map is hidden, not reframed, and the marker isn't
  centered by the camera. Acceptable because a detail page only needs "here is
  where it is," not an interactive map.
- Orthogonal to the subjecthood ring
  ([ADR 0007](0007-the-marker-ring-signals-subjecthood.md)): the clip keys off
  the focus coordinates, the ring off `isMarkerOutlined`, so a `/status/<id>`
  marker stays cropped and visible whether or not it rings.
