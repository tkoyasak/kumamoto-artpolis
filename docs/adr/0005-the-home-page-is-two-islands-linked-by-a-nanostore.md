# The home page is two independent islands linked by a nanostore

The home page pairs a Preact table island with a separate vanilla-JS map island
(maplibre), rather than one component owning both. They share only hover state,
through a nanostores atom keyed by each row's `href`.

Keeping the map outside the framework lets its ~1 MB maplibre bundle be
code-split and lazy-loaded on its own schedule, and lets the map instance persist
across navigation. See [docs/issues/0001-maplibre-chunk-loading.md](../issues/0001-maplibre-chunk-loading.md)
and [docs/issues/0002-map-persist-across-navigation.md](../issues/0002-map-persist-across-navigation.md)
for the benchmarked specifics.

"Explorer" — the earlier name for this home view — is retired: the view exists
only on the home page, so "home" is unambiguous, and the code had already
stretched the word past that view (the "explorer" row type fed the detail pages
too). Names derive from the glossary's umbrella term Entry instead (`EntryRow`,
`EntriesTable.tsx`, `EntriesMap.astro`).
