# TODO

## Content / data

- [ ] Replace sample data with real **projects** (accurate coordinates, official Art Polis numbers, remaining projects) and write each description body.
- [ ] Fill the **KAP'92** buildings 1–46 from the prefecture list (replace the 熊本城 sample; verify coordinates). Source: <https://www.pref.kumamoto.jp/soshiki/115/4477.html>
- [ ] Add photos (public R2 URLs) to project descriptions and `status/` entries; set up the R2 bucket + public domain.

## Features

- [ ] Footer: add a link to KAP'92, and consider a `/kap92` index (list) page (only detail pages exist now).
- [ ] Let visit records (`status`) reference KAP'92 buildings too — currently `status.projects` references only the `projects` collection, so KAP'92 has no visit dates.
- [ ] Style the Markdown bodies (e.g. Tailwind Typography); project/kap92/status bodies currently render unstyled.

## Performance / architecture (decided — revisit later)

- [x] Home map JS loading: maplibre code-split, loaded at natural priority (not head-preloaded). See [issues/maplibre-chunk-loading.md](issues/maplibre-chunk-loading.md).
- [ ] Qwik island migration (resumability, smaller upfront JS): blocked for now — `@qwik.dev/astro` is Qwik v2 (beta) while `@tanstack/qwik-table` targets Qwik v1. Revisit when qwik-table supports Qwik v2.
