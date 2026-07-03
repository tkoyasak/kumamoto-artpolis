# The explorer is two independent islands linked by a nanostore

The home page pairs a Preact table island with a separate vanilla-JS map island
(maplibre), rather than one component owning both. They share only hover state,
through a nanostores atom keyed by each row's `href`.

Keeping the map outside the framework lets its ~1 MB maplibre bundle be
code-split and lazy-loaded on its own schedule, and lets the map instance persist
across navigation. See [docs/issues/0001-maplibre-chunk-loading.md](../issues/0001-maplibre-chunk-loading.md)
and [docs/issues/0002-map-persist-across-navigation.md](../issues/0002-map-persist-across-navigation.md)
for the benchmarked specifics.
