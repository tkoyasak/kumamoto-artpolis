# Home map: persist the maplibre instance across navigation

Status: **resolved** (2026-07-01)

Leaving the home page for a detail page and returning re-initialized the map from
scratch — a visible lag before it reappeared. Whether (and how) to keep the
maplibre instance alive across navigation instead.

## Background

The home page (`/`) is a fixed fullscreen maplibre map
(`EntriesMap.astro`, a vanilla client `<script>`) with the table
(`EntriesTable.tsx`) scrolling on top. Detail pages (`/projects/<id>`,
`/kap92/<id>`) have no map.

The site was a plain Astro MPA: every navigation is a full document load. So
`/` → detail → back to `/` destroyed and recreated the whole page, and the map
script re-ran `new maplibregl.Map(...)` every time — re-fetching the style
(cartocdn), re-downloading tiles, and rebuilding the WebGL context. That is the
lag the user reported ("戻ると再度読み込みが走る").

In an MPA the JS heap dies on unload, so the live map cannot literally be kept
"in the background". Keeping it alive requires turning navigation from a full
reload into a client-side DOM swap.

## What we tried

Two ways to survive the `/` → detail → `/` round trip were considered:

1. **bfcache only** — rely on the browser back/forward cache to restore the
   frozen page (live map included) on the _back button_. Near-zero code, but
   only covers back/forward — clicking the header "Home" link (a normal
   navigation) never uses bfcache, and that is a primary return path here.
2. **ClientRouter + `transition:persist`** (chosen) — add Astro's
   `<ClientRouter />` so navigation becomes a client-side swap, and move the map
   into a layout-level `#map-layer` marked `transition:persist` so its DOM node
   and maplibre instance carry across every navigation. Works for link clicks
   and back/forward alike.

The tradeoff of (2): the map layer now lives in the shared layout, so maplibre
(~1 MB) loads on _every_ page, not just `/` — in tension with the code-split,
load-on-the-home-page-only decision in
[0001-maplibre-chunk-loading.md](0001-maplibre-chunk-loading.md). Accepted deliberately:
the download is once-per-session and cached; on detail pages the instance just
sits idle; the map is hidden off `/` via `display:none` (toggled on
`astro:after-swap`) and `map.resize()` is called on return since a hidden
container has no dimensions.

## Measuring it

To confirm the round trip actually got faster (and not just "feels" faster —
same lesson as the maplibre writeup), we measured **return-home map re-display
time**: from clicking the header "Home" link on a detail page until the map is
shown again _and the network has gone quiet_ (all reloading finished). Network
quiet is the right signal because refetching map JS / style / tiles is exactly
what persist eliminates — the maplibre canvas element alone appears too early
(it is created synchronously in the `Map` constructor, before any tiles).

Tooling, mirroring the maplibre writeup: Playwright driving **system Chrome**
(`channel: "chrome"`, `--enable-unsafe-swiftshader` for headless WebGL), CDP
`Network.emulateNetworkConditions` throttling (~750 KB/s, 50 ms RTT).
`before` (git `HEAD`, the MPA) and `after` (this branch) were built and served
uncompressed on separate ports; rounds **interleaved** `before`/`after` to avoid
ordering bias, after a warmup pass. Playwright was a throwaway `bun add -d`
(removed afterwards; `bun.lock`/`package.json` restored from `HEAD`).

Two deliberate choices about realism:

- **Return via a link click, not the back button** — the pessimistic, always-hit
  path (bfcache never applies), and the one the persist approach is meant to fix.
- **Warm HTTP cache** across rounds (same session) — a returning user already has
  the style and tiles cached, so this is the fair scenario. Cold cache would
  overstate the win.

## Results

Return-home map re-display (ms), warm cache, throttled, 24 interleaved rounds.
Median `[p25–p75]`, two independent runs:

| run | before (MPA)     | after (persist) | speedup       |
| --- | ---------------- | --------------- | ------------- |
| 1   | 1077 [1023–1197] | 573 [477–712]   | 1.9× / −504ms |
| 2   | 1309 [957–1511]  | 737 [499–1163]  | 1.8× / −572ms |

## Conclusion

- **Persisting the map is ~1.8–1.9× faster on return** (~500 ms saved here), and
  the direction is stable across runs. The IQRs are wide because remote cartocdn
  tile fetches vary round to round, but the medians stay clearly separated.
- The remaining `after` cost is **not** the map — it is the ClientRouter HTML
  fetch plus re-hydrating the Preact table island (`client:load`). The map
  itself contributes ~nothing on return; that is the eliminated work.
- Caveats (same as the maplibre writeup): uncompressed serving inflates absolute
  numbers; production (Cloudflare, brotli) ships maplibre at ~250 KB so the
  bandwidth part of the gap shrinks. But map re-init (WebGL context, style
  layout, `fitBounds`) is CPU-bound and compression-independent, so a real chunk
  of the gap persists. The _direction_ is what matters.

**Decision: ClientRouter + `transition:persist` — the map lives in the layout and
survives navigation; hidden off `/` and resized on return.**

## Implementation

- `src/layouts/Base.astro`: adds `<ClientRouter />` and an `#map-layer`
  (`transition:persist`) wrapping `EntriesMap`; builds the marker data via
  `getEntryRows()` / `toMapEntries()`.
- `src/lib/entries.ts`: `getEntryRows()` (merge + sort both collections) and
  `toMapEntries()`, shared by the home table and the layout map.
- `src/pages/index.astro`: no longer renders the map — just the table over the
  persisted layer.
- `src/components/EntriesMap.astro`: init runs once (bundled module script);
  `astro:after-swap` toggles `#map-layer` visibility to `/` only and calls
  `map.resize()` on return.

## Addendum (2026-07-02): the tradeoff was removed, plus two fixes

Follow-up review found three problems with the implementation above, all fixed
together:

1. **Non-home pages were click-blocked until the map script ran.** The
   `#map-layer` is `pointer-events-auto` + `fixed inset-0` and was hidden only
   client-side, after the ~1 MB maplibre chunk executed — so on a direct visit
   to `/about` or a detail page, the invisible layer swallowed every click until
   then (forever, with JS disabled). `Base.astro` now renders the layer with
   `display:none` off `/`; the script only takes over the toggling.
2. **The accepted "maplibre loads on every page" tradeoff is gone.** The script
   now dynamically imports maplibre and fetches the marker data only on the
   first navigation that shows the map, so non-home visits never pay for the
   map JS, style, or tiles. Persist behavior on return is unchanged. This stays
   consistent with the chunk-loading benchmark
   ([0001-maplibre-chunk-loading.md](0001-maplibre-chunk-loading.md)): still the split
   chunk, still discovered after the glue script, still no preload.
3. **Marker clicks used `window.location.href`**, a full reload that destroyed
   the persisted instance this whole design exists to keep. They now use the
   ClientRouter's `navigate()`, like the table rows.

The marker data also moved out of the per-page inline JSON `<script>` into a
prerendered `/map-markers.json` endpoint (`src/pages/map-markers.json.ts`), fetched
alongside the maplibre import — one cacheable asset instead of duplicating the
full dataset into every page's HTML.
