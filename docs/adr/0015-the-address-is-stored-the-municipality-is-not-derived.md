# The address is stored; the municipality is not derived from it

Decided 2026-07-14.

## Context

With the entry files as the source of truth (ADR 0013), the official 所在地
was the one datum the sync tool used but never stored: it fed geocoding and
was then thrown away. So `lat`/`lng` had no recorded provenance, a rewritten
address on a prefecture page could invalidate a marker unnoticed, and
re-geocoding meant re-fetching. The hand-researched addresses for entries
whose pages carry no 所在地 lived only in the registry's `overrides.address`,
and died with it.

Storing the address raised the question of whether `municipality` — today a
stored field — should stop being one and instead be derived from the address
by a schema transform, since it looks like a prefix of it.

Measured against the real pages: of the 25 entries whose municipality names a
熊本市 ward, only **4** have that ward in their 所在地. **20** do not
(「熊本市草葉町5-13」, 「熊本市清水町新地1917」, 「熊本市西原3丁目2番」…) —
addresses predating the 2012 政令市 transition name no ward — and 1 page has
no 所在地 at all. The stored ward comes from geocoding (the GSI search's
returned title), which is why the sync tool retries the search with each ward
inserted. `municipality` is therefore not a function of the address.

## Decision

`location` joins the frontmatter: the official 所在地 **verbatim**, optional
(a few pages carry none, and kap92 has no page). It is what `lat`/`lng` are
geocoded from — the tool now geocodes the _stored_ address, so a hand-written
one grounds a marker exactly like a fetched one — and it is diffed against the
page on every sync, closing the last blind spot in the drift report.

`municipality` stays a stored, geocoded field. Deriving it from `location`
would either regress those 20 entries from `熊本市中央区` to `熊本市`, or
force the address to be falsified with a ward the prefecture never wrote —
corrupting the raw datum to fix a derived one, and firing a permanent address
diff. Where an address _does_ name a ward, a test cross-checks the two.

`pdfs: { ja, en }` becomes two flat lists, `pdfJa`/`pdfEn`, dropping an
asymmetry (`ja` was plural, `en` scalar) that only reflected today's data.
Field order follows the reading order of an entry: identity, place,
attribution, then sources.

## Consequences

- Coordinates gain provenance, address drift becomes visible, and a stub for a
  page with no 所在地 can be completed by hand-writing the address and letting
  the tool geocode it.
- `municipality` and `location` are two fields that can disagree, checked only
  where the address names a ward. Accepted: the alternative loses data.
- Three entries keep no `location` (0082, 0109 — their pages hold several
  building records and none matches the entry name; 0115 — its page has no
  所在地). Their coordinates predate this ADR and stay as stored.
