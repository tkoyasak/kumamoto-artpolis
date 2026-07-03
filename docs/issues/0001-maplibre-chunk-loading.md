# Home map: maplibre chunk loading strategy

Status: **resolved** (2026-06-16)

How the home page should load maplibre (~1 MB) for the map island, and whether
splitting it into its own chunk and/or preloading it from `<head>` actually helps.

## Background

The home page (`/`) is an "explorer": a Preact + `@tanstack/react-table` island
(`ProjectsTable.tsx`, `client:load`) next to a vanilla maplibre map island
(`ProjectsMap.astro`, a client-only `<script>`), linked by a shared `$hovered`
nanostore. maplibre is by far the largest asset on the page.

An old `TODO.md` note claimed the map JS "waterfalls" because maplibre was
dynamically imported _after_ the React island hydrated. That description was
already stale: the map had since become a vanilla island with a **static**
import, so it never waited for hydration. But maplibre (~1 MB) was bundled
_into_ the map's single script chunk.

## What we tried

Three loading strategies for maplibre:

1. **single** — bundled into the map island's one chunk (the original). One
   early module `<script>` in the body; no separate chunk.
2. **split** — `manualChunks` pulls `maplibre-gl` into its own chunk, so the
   tiny glue code and maplibre cache independently. No preload.
3. **preload** — `split` plus a custom Astro integration that injects
   `<link rel="modulepreload" href="/_astro/maplibre.<hash>.js">` into the
   `<head>` of pages using the map (captured from the client bundle in
   `generateBundle`, written in the `astro:build:done` hook).

We first reasoned about these from first principles and shipped **preload** —
then loading _felt slower_, which kicked off actual measurement.

## Measuring it

Tooling: Playwright driving the **system Chrome** (`channel: "chrome"`, so no
browser download), CDP `Network.emulateNetworkConditions` throttling
(~750 KB/s, 50 ms RTT), cold cache per load. Playwright was a throwaway
`bun add -d` (removed afterwards; `bun.lock` restored from `HEAD`).

Key methodology lesson: **the first attempt measured each variant in a fixed
order (single → split → preload), and the results were dominated by noise /
ordering bias** — later variants benefited from a warmer machine and OS file
cache, so rankings flipped between runs. The fix was to serve all three variants
simultaneously on separate ports and **interleave + shuffle** the variant order
every round, dropping a warmup pass. Only then did the numbers become tight and
reproducible.

Caveat: the interleaved server serves **uncompressed**, so absolute numbers are
inflated (1 MB at 750 KB/s ≈ 1.4 s); production (Cloudflare, brotli) ships
maplibre at ~250 KB, so real-world gaps are proportionally smaller. The
_direction_ is what matters.

## Results

Interleaved, shuffled, 20 rounds, cold cache each load. Median ms `[p25–p75]`,
two independent runs — same ordering both times:

| metric            | single           | **split**         | preload          |
| ----------------- | ---------------- | ----------------- | ---------------- |
| map JS arrives    | 1707 [1705–1711] | 1707 [1705–1711]  | 1709 [1708–1711] |
| table interactive | 620 [616–624]    | **577 [575–582]** | 621 [618–625]    |
| FCP               | 404 [400–416]    | **366 [360–372]** | 408 [404–416]    |
| load              | 1816 [1815–1822] | 1818 [1816–1823]  | 1817 [1815–1822] |

## Conclusion

- **Preloading maplibre does not make the map appear sooner.** Map-JS arrival is
  identical across all three variants — it is bandwidth-bound, so discovering the
  request earlier doesn't help on a saturated link.
- **Head-preloading the ~1 MB chunk hurts the things that matter.** Forcing a
  large, non-critical asset to high priority in `<head>` delayed FCP and island
  hydration; `preload` was never faster than `single` on anything.
- **`split` (own chunk, no preload) is fastest for FCP and interactivity**
  (~40 ms here, IQRs non-overlapping) because maplibre is discovered _last_
  (after the glue chunk parses), letting the small critical island chunks win the
  bandwidth race. It also gives cross-deploy caching, and — crucially — does
  **not** slow map arrival.
- The "waterfall" originally feared (glue → import maplibre) is a non-issue: map
  arrival is bandwidth-bound and identical regardless.

**Decision: `split` — code-split maplibre, load at natural priority, no preload.**

## Implementation

- `astro.config.ts`: `vite.build.rollupOptions.output.manualChunks` puts
  `maplibre-gl` in a `maplibre` chunk. The preload integration was removed.
- `src/components/ProjectsMap.astro`: comment documents why it is not
  head-preloaded.
- `TODO.md`: the loading item is closed with the benchmark result.
