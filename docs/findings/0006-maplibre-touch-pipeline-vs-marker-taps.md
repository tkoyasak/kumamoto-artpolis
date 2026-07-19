# maplibre's touch pipeline fights marker taps two ways

Found 2026-07-19.

Markers are DOM overlays inside maplibre's canvas container, so their touch
events bubble into the map's own gesture recognizers. Two consequences bit the
two-tap marker select:

## `map.on("click")` fires for taps on a marker

maplibre synthesizes its `click` from `touchend`/pointer events on the canvas
container — not from the DOM `click` — so `stopPropagation()` in a marker's
DOM `click` handler cannot keep a marker tap out of it. A "background tap"
handler on the map therefore fires on marker taps too, and must filter by
`event.originalEvent.target.closest(".map-marker")`.

## The double-tap-zoom recognizer swallows the second tap's click

Two taps on the same marker within the double-tap window get claimed by
maplibre's tap-zoom handler, which `preventDefault`s the second `touchend` —
the browser then never synthesizes the second DOM `click`, so a
"second tap navigates" handler never runs (and the camera zooms instead).
Manually spaced taps (~800ms) worked, which is what made this look flaky.

What it means: marker elements must call `stopPropagation()` on `touchstart` /
`touchend` so marker taps never enter maplibre's gesture pipeline at all
(`EntriesMap.astro`). The target filter on `map.on("click")` stays for the
mouse path, where `mousedown`/`mouseup` still bubble.
