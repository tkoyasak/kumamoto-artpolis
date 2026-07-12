# The map persists across navigation, so navigation becomes a client swap

Decided 2026-07-01.

## Context

As a plain Astro MPA every navigation is a full document load, so leaving the
home page for a detail page and coming back destroyed the maplibre instance and
rebuilt it from scratch — re-fetching the style, re-downloading tiles, rebuilding
the WebGL context. The lag was visible enough to be reported.

In an MPA the JS heap dies on unload, so the live map cannot be kept alive in the
background: keeping the instance requires turning navigation from a full reload
into a client-side DOM swap. The cheap alternative was to lean on the browser's
bfcache, which restores the frozen page — map included — for free, but only on
back/forward. Clicking the header "Home" link is a normal navigation and a
primary return path here, and bfcache never applies to it.

## Decision

Astro's `<ClientRouter />` makes navigation a client-side swap, and the map moves
out of the home page into a layout-level `#map-layer` marked `transition:persist`,
so its DOM node and maplibre instance carry across every navigation — link clicks
and back/forward alike. Marker clicks navigate through the ClientRouter too,
never `window.location`, which would destroy the instance this design exists to
keep.

The layer lives in the layout, so it is rendered on every page. It is hidden
server-side off the fullscreen pages (never client-side-only: a `fixed inset-0`
layer that is only hidden once the ~1 MB chunk executes swallows every click
until then, forever with JS disabled), maplibre and the marker data are imported
only on the first navigation that actually shows the map, and `map.resize()` runs
on return because a hidden container has no dimensions.

## Consequences

- Persisting is ~1.8–1.9× faster on return (`docs/findings/0002`); what remains is
  the ClientRouter HTML fetch and island re-hydration, not the map.
- bfcache alone is rejected: it covers only back/forward, which is not how a user
  returns from a detail page here.
- The whole site is now a client-swapped SPA-ish document, whether or not a page
  cares. Every subsequent feature inherits swap semantics — hover state that does
  not survive a swap (`docs/findings/0004`), View Transitions, persist ids that
  must be pinned (`docs/findings/0003`).
- Lazy-importing maplibre on first show keeps this consistent with ADR 0004: a
  visitor who never sees the map still never pays for it, even though the layer
  is in the layout.
- The camera is now shared, persisted state — which is what later forces detail
  pages to crop rather than move it (ADR 0007).
