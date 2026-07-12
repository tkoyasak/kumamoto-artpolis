# Head-preloading maplibre does not make the map appear sooner

Found 2026-06-16.

maplibre (~1 MB) is by far the largest asset on the home page. Three loading
strategies were benchmarked against each other:

1. **single** — maplibre bundled into the map island's one chunk.
2. **split** — `manualChunks` pulls `maplibre-gl` into its own chunk; no preload.
3. **preload** — `split` plus an Astro integration injecting
   `<link rel="modulepreload">` for the maplibre chunk into `<head>`.

## Method

Playwright driving the system Chrome (`channel: "chrome"`, so no browser
download), CDP `Network.emulateNetworkConditions` throttling (~750 KB/s,
50 ms RTT), cold cache per load. Playwright was a throwaway dev dependency,
removed afterwards.

**The first attempt measured each variant in a fixed order (single → split →
preload) and the results were dominated by ordering bias** — later variants
benefited from a warmer machine and OS file cache, so rankings flipped between
runs. The fix was to serve all three variants simultaneously on separate ports
and interleave + shuffle the variant order every round, after a warmup pass.
Only then did the numbers become tight and reproducible. Any future benchmark
here should assume a fixed-order comparison is noise until proven otherwise.

The interleaved server serves uncompressed, so absolute numbers are inflated
(1 MB at 750 KB/s ≈ 1.4 s); production (Cloudflare, brotli) ships maplibre at
~250 KB, so real-world gaps are proportionally smaller. The direction is what
matters.

## Results

Interleaved, shuffled, 20 rounds, cold cache each load. Median ms `[p25–p75]`,
two independent runs — same ordering both times:

| metric            | single           | **split**         | preload          |
| ----------------- | ---------------- | ----------------- | ---------------- |
| map JS arrives    | 1707 [1705–1711] | 1707 [1705–1711]  | 1709 [1708–1711] |
| table interactive | 620 [616–624]    | **577 [575–582]** | 621 [618–625]    |
| FCP               | 404 [400–416]    | **366 [360–372]** | 408 [404–416]    |
| load              | 1816 [1815–1822] | 1818 [1816–1823]  | 1817 [1815–1822] |

## What it means

- **Preloading maplibre does not make the map appear sooner.** Map-JS arrival is
  identical across all three variants — it is bandwidth-bound, so discovering
  the request earlier does not help on a saturated link.
- **Head-preloading the ~1 MB chunk hurts the things that matter.** Forcing a
  large, non-critical asset to high priority in `<head>` delayed FCP and island
  hydration; `preload` was never faster than `single` on anything.
- **`split` is fastest for FCP and interactivity** (~40 ms here, IQRs
  non-overlapping) because maplibre is discovered _last_ (after the glue chunk
  parses), letting the small critical island chunks win the bandwidth race. It
  also caches across deploys, and does not slow map arrival.
- The "waterfall" originally feared (glue chunk → dynamic import of maplibre) is
  a non-issue: map arrival is bandwidth-bound and identical regardless.
