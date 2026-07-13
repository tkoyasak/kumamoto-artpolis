# The entries are hand-curated; the tool only reports

Decided 2026-07-14.

## Context

The catalog is ~130 entries and grows by one or two a year. That is small
enough to read end to end, which changes what tooling is worth having: the
value of a tool that _writes_ entries — and of the machinery that keeps its
writes safe (fill-only semantics, drift reports that must never overwrite,
registry-recovered overrides) — is much lower than it looked when the catalog
was being bulk-imported (ADR 0012, 0013).

It also reopens a decision. ADR 0015 kept `municipality` a stored field
because it is not derivable from the _prefecture's_ address: 20 of the 25
ward-bearing entries have a 所在地 that names no ward, the ward having come
from geocoding. That argument only holds while the address must stay verbatim.
If the address is hand-curated instead, the ward can simply be written into
it, and the municipality follows from it.

## Decision

**The entry files are hand-curated.** `bun run check-projects`
(`scripts/check-projects.ts`) never writes: it fetches the page an entry's
`url` points at and prints what that page says next to what the entry says.
Applying anything it reports means editing the md.

- It checks exactly the fields that page carries — `location` (所在地), `use`
  (主要用途), `architects` (設計者) — and geocodes `location` for an entry
  that has no coordinates yet. `name` and `completedYear` live on the
  prefecture's _list_ page, not the entry's own, and are no longer checked;
  neither are the PDF links.
- **`municipality` is derived from `location`** by the content schema
  (`src/lib/address.ts`), so a place is written down once. The derivation
  rejects a ward-less 熊本市 address — the address must name its ward — which
  fails the build rather than quietly showing a coarser municipality. The 20
  addresses whose official wording predates the 2012 政令市 transition were
  given their ward, taken from the municipality that had been geocoded from
  them.
- **`location` is required**, and no longer verbatim: it is the official 所在地
  with the ward filled in and the prefecture's trailing link notes dropped. The
  four entries that had none were given one (three read off pages whose
  「所 在 地：」 label the parser had been missing; 熊本城 by hand).
- **The PDF links go back to the body** as hand-written Markdown, next to the
  prose. Nothing but `url` stays in the frontmatter, and the tool owns no part
  of the file.

## Consequences

- One writer: the human. The fill/overwrite/diff semantics of ADR 0013 are
  gone, and with them the class of bug where a tool's idea of an entry
  overwrites a researched one.
- Nothing watches the prefecture's list page any more, so a newly added
  official number surfaces only when someone looks. Accepted at this size;
  numbers 64, 87, 121, 122 remain uncatalogued and are tracked in `TODO.md`.
- The stored address diverges from the prefecture's wording for the 20 warded
  entries. The tool's comparison normalizes the ward away, so this is not
  reported as a difference — the cost of the trade, and it buys the derivation.
- ADR 0015's decision on `municipality` is overturned; its measurement (20 of 25) is what made this one checkable, and stands.
