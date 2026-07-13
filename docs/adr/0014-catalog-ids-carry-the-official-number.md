# Catalog ids carry the official number

Decided 2026-07-13.

## Context

Catalog ids were bare human-readable slugs (ADR 0008), so the files listed in
arbitrary alphabetical order and neither a filename nor a URL revealed which
official row an entry was. ADR 0008 also weighed pure-`number` filenames and
rejected folding the number into the id, valuing decoupling from official
renumbering; in practice the prefecture list is append-only and the number is
the natural key everyone — the list pages, the sync tool, the table's default
sort — already speaks.

## Decision

A catalog id is `NNNN-<slug>` (zero-padded four-digit official number plus
the former slug), for both `projects/` and `kap92/`: `0088-amakusa-arbor`,
`0001-kumamoto-castle`. Excluded markers follow the same pattern. `number`
stays a frontmatter field; a test pins prefix == number
(`tests/content-files.test.ts`). Split entries share a prefix and differ in
slug. All 128 existing entries were renamed in one migration (status
references updated in the same commit), and the old URLs 404 — no redirects,
the external-link cost of a personal catalog being judged lower than carrying
a 128-row redirect map forever.

## Consequences

- File listings and URLs sort and read in official-number order; an entry's
  number is visible everywhere its id appears.
- This is a one-time break of ADR 0008's "chosen once and kept stable" — that
  ADR stays as the record of its day; the id-is-the-filename mechanism itself
  is unchanged. Stability applies again from here on.
- Should the prefecture ever renumber, the ids lie until renamed — accepted
  against an append-only list.
- Anything deriving expectations from content filenames (the e2e helpers, the
  transition-name collision test) keeps working unchanged, since they read
  ids off the files.
