# The home page is two independent islands linked by a nanostore

## Status

Accepted (2026-07-03).

## Context

The home page pairs a sortable table with a maplibre map, and hovering a row
highlights its marker (and vice versa). The obvious shape — one framework
component owning both, sharing hover through component state — ties
maplibre's ~1 MB bundle to framework hydration and puts the map instance
inside a component lifecycle, where navigation would tear it down.

## Decision

The home page is two independent islands: the Preact table island and a
separate vanilla-JS map island (maplibre), rather than one component owning
both. They share only hover state, through a nanostores atom (`$hovered`)
keyed by each row's `href`.

## Consequences

- The maplibre bundle is code-split and lazy-loaded on its own schedule, and
  the map instance persists across navigation. See
  [docs/issues/0001-maplibre-chunk-loading.md](../issues/0001-maplibre-chunk-loading.md)
  and
  [docs/issues/0002-map-persist-across-navigation.md](../issues/0002-map-persist-across-navigation.md)
  for the benchmarked specifics.
- The single-component shape is rejected, and with it shared component
  state: the islands cannot pass props or context, so every cross-island
  interaction — hover today, anything later — must be wired through the
  store.
- "Explorer" — the earlier name for this home view — is retired: the view
  exists only on the home page, so "home" is unambiguous, and the code had
  already stretched the word past that view (the "explorer" row type fed the
  detail pages too). Names derive from the glossary's umbrella term Entry
  instead (`EntryRow`, `EntriesTable.tsx`, `EntriesMap.astro`).
