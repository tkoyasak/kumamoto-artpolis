# Persisting the map is ~1.8× faster on return, and the rest is not the map

Found 2026-07-01.

As a plain Astro MPA, every navigation was a full document load, so `/` → detail
→ `/` re-ran `new maplibregl.Map(...)`: re-fetching the style (cartocdn),
re-downloading tiles, rebuilding the WebGL context. That was the lag reported as
「戻ると再度読み込みが走る」. Keeping the instance alive requires turning
navigation into a client-side DOM swap; the question was what that actually buys.

## Method

Measured **return-home map re-display time**: from clicking the header "Home"
link on a detail page until the map is shown again _and the network has gone
quiet_. Network quiet is the right signal because refetching map JS / style /
tiles is exactly what persistence eliminates — the maplibre canvas element alone
appears too early, since it is created synchronously in the `Map` constructor,
before any tiles.

Playwright driving the system Chrome (`channel: "chrome"`,
`--enable-unsafe-swiftshader` for headless WebGL), CDP throttling (~750 KB/s,
50 ms RTT). `before` (the MPA) and `after` (ClientRouter + `transition:persist`)
were built and served uncompressed on separate ports, rounds interleaved to
avoid the ordering bias that wrecked the first maplibre benchmark
([0001](0001-maplibre-chunk-loading.md)), after a warmup pass.

Two deliberate choices about realism:

- **Return via a link click, not the back button** — the pessimistic, always-hit
  path (bfcache never applies), and the one persistence is meant to fix.
- **Warm HTTP cache** across rounds — a returning user already has the style and
  tiles cached. A cold cache would overstate the win.

## Results

Return-home map re-display (ms), warm cache, throttled, 24 interleaved rounds.
Median `[p25–p75]`, two independent runs:

| run | before (MPA)     | after (persist) | speedup       |
| --- | ---------------- | --------------- | ------------- |
| 1   | 1077 [1023–1197] | 573 [477–712]   | 1.9× / −504ms |
| 2   | 1309 [957–1511]  | 737 [499–1163]  | 1.8× / −572ms |

## What it means

- **Persisting the map is ~1.8–1.9× faster on return** (~500 ms saved here), and
  the direction is stable across runs. The IQRs are wide because remote cartocdn
  tile fetches vary round to round, but the medians stay clearly separated.
- **The remaining cost is not the map.** What is left in `after` is the
  ClientRouter HTML fetch plus re-hydrating the Preact table island; the map
  itself contributes ~nothing on return. Further work on this path should target
  hydration, not the map.
- Same caveat as [0001](0001-maplibre-chunk-loading.md): uncompressed serving
  inflates the absolute numbers. But map re-init (WebGL context, style layout,
  `fitBounds`) is CPU-bound and compression-independent, so a real chunk of the
  gap survives compression.
