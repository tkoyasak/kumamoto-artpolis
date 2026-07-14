# The catalog is a typed data module

Decided 2026-07-14.

## Context

The prefecture's official list catalogs 122 numbered projects; the collections
held five hand-written samples. Importing the list forced the question of who
owns an entry, and three answers were built and abandoned first.

- **A registry plus generated Markdown.** A committed JSON registry held the
  number → id assignment, splits, exclusions and per-entry overrides, and an
  importer generated the entry files from it. Truth about one entry then lived
  in two hand-maintained places: a correction went into the Markdown while the
  registry still claimed the old value, and neither file could say which value
  was deliberate.
- **A fill-only sync tool.** The registry was folded into the entries and the
  importer became a tool that filled absent frontmatter and reported drift,
  promising never to overwrite a stored value. That promise was the whole
  feature, and the machinery keeping it — fill-only fields, diffs that must not
  be applied automatically, coordinates exempted from comparison because a
  re-geocode always disagrees — cost more than the drift it caught.
- **A read-only checker.** The tool stopped writing entirely and only printed
  what an entry's source page said next to what the entry said. It needed a
  regex parser spanning three generations of the prefecture's markup, and a
  clean run still reported differences that were quirks of the pages rather
  than errors in the entries.

Underneath all three sat an unaddressed complaint: Markdown frontmatter is
untyped. Writing an entry earned no completion and no type error, and every
consumer that was not Astro — the tests, the e2e helpers, the tooling —
re-implemented a directory scan and a frontmatter parse to read it back.

## Decision

The catalog is `src/data/projects.ts` and `src/data/kap92.ts`: hand-written
TypeScript arrays that Astro loads directly (`loader: () => projects`). There
are no catalog Markdown files and no generation step — generating them from a
data source would restore the two-places problem the registry died of.

`catalogSchema` (`src/content.config.ts`) is both the validation Astro runs and,
through `EntryInput`, the type the data is written against, so the two cannot
drift apart.

- **`id` is a field, not a filename.** This overturns the filename == id
  mechanism of ADR 0008 for the catalog — visit records keep it — while keeping
  that ADR's reason for leaving the official number out of the id: renumbering
  would otherwise break every URL and every visit reference.
- **Official rows with no building are not entries.** They are `excluded` in
  `src/data/projects.ts` and never reach a collection, so the schema is a single
  shape and no consumer narrows.
- **Entries have no body.** Their links are `sources: { title, url }[]`, the
  title drawn from a closed set.
- **`location` is stored and `municipality` derived from it**, so a place is
  written down once.
- **Nothing checks the entries against the prefecture's pages.** The one tool
  left is `bun run geocode`, which prints coordinates for an address.

## Consequences

- Writing an entry is type-checked as it is written, and the catalog can be read
  in one file. The generated `src/content/README.md` index went with the
  Markdown, since the array is that index.
- Astro's array loader stores entries by id and a duplicate silently overwrites
  its predecessor, so uniqueness — free while the filesystem held it — becomes a
  test.
- Entry URLs are `/projects/<slug>`.
- A new official number, or a corrected address, surfaces only when a human
  looks.
- Prose can come back without the files: a `body` field rendered through the
  loader's `renderMarkdown` would restore `<Content />`.
