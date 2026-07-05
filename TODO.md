# TODO

## Content / data

- [ ] Replace sample data with real **projects** (accurate coordinates, official Artpolis numbers, remaining projects) and write each description body.
- [ ] Fill the **KAP'92** buildings 1–46 from the prefecture list (replace the 熊本城 sample; verify coordinates). Source: <https://www.pref.kumamoto.jp/soshiki/115/4477.html>
- [ ] Add photos (public R2 URLs) to project descriptions and `status/` entries; set up the R2 bucket + public domain.

## Features

- [ ] Footer: add a link to KAP'92, and consider a `/kap92` index (list) page (only detail pages exist now).
- [ ] Style the Markdown bodies (e.g. Tailwind Typography); project/kap92/status bodies currently render unstyled.

## Performance / architecture (decided — revisit later)

- [x] Home map JS loading: maplibre code-split, loaded at natural priority (not head-preloaded). See [docs/issues/0001-maplibre-chunk-loading.md](docs/issues/0001-maplibre-chunk-loading.md).
- [x] Persist the map across navigation (ClientRouter + `transition:persist`) so returning home no longer re-inits maplibre (~1.8–1.9× faster return, benchmarked). The original load-on-every-page tradeoff was later removed: the map (maplibre chunk + `/map-markers.json`) now initializes lazily, only when `/` is first shown. See [docs/issues/0002-map-persist-across-navigation.md](docs/issues/0002-map-persist-across-navigation.md).
- [ ] Qwik island migration (resumability, smaller upfront JS): blocked for now — `@qwik.dev/astro` is Qwik v2 (beta) while `@tanstack/qwik-table` targets Qwik v1. Revisit when qwik-table supports Qwik v2.

## UI

- [x] Morph the entry row between the home table and the detail page (View Transitions), with the row's outline shown only during the morph. See [docs/issues/0003-entry-row-view-transition.md](docs/issues/0003-entry-row-view-transition.md).
- [ ] font試す タイトル "Kumamoto Artpolis" https://fonts.google.com/specimen/Zen+Dots
