# maplibre is code-split and left at natural priority, not head-preloaded

Decided 2026-06-16.

## Context

maplibre (~1 MB) is by far the largest asset the site ships, and the map is an
island of its own (ADR 0003), so how its chunk is loaded is a free choice. The
intuitive optimizations both point the same way: give the biggest asset its own
chunk _and_ discover it as early as possible by preloading it from `<head>`, so
the map appears sooner. That was reasoned out from first principles and shipped —
and then loading _felt_ slower, which kicked off a benchmark of three variants
(bundled / split / split+preload).

The measurement says the intuition is wrong on both counts
(`docs/findings/0001`): map-JS arrival is bandwidth-bound and identical across
all three, so preloading buys nothing, while forcing a large non-critical asset
to high priority in `<head>` delays FCP and island hydration.

## Decision

`manualChunks` pulls `maplibre-gl` into its own chunk, and nothing preloads it.
The map island dynamically imports it when the map first shows, at natural
priority.

## Consequences

- Head-preloading is rejected, and the custom Astro integration that injected the
  `modulepreload` link is deleted. It made the site slower at what matters and no
  faster at the map.
- Splitting alone wins FCP and time-to-interactive (~40 ms in the benchmark)
  precisely _because_ maplibre is discovered last: the small critical island
  chunks win the bandwidth race. Anything that promotes maplibre earlier in the
  discovery order gives that back.
- This is a decision someone will reasonably want to reverse — "the map is huge,
  preload it" is the intuitive move. The benchmark, not the reasoning, is the
  answer to that; re-run it before changing the loading strategy.
- The `astro.config.ts` chunk rule and the island's dynamic import are now
  coupled: bundling maplibre back into the island's own chunk would silently undo
  the split.
