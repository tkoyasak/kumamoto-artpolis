# The catalog is a Markdown collection

Decided 2026-07-15.

## Context

The prefecture's official list catalogs 122 numbered projects; the collections
held five hand-written samples. Importing the list forced the question of who
owns an entry, and three answers were built and abandoned first, all failing the
same way.

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

Each split one entry's truth across two places, or read the prefecture's pages
back to police the entries; the lesson was to keep the entry a single
hand-curated source and check nothing against the pages.

That left the question of what form the single source takes. A first answer was
hand-written TypeScript arrays that Astro loads directly. The catalog was then a
set of structured records — an id, a name, coordinates, a closed list of source
links — and nothing else. An entry had no prose, so there was no text to write,
only fields, and fields are better typed as they are written than parsed back
out of untyped frontmatter, where the tests, e2e helpers and tooling each
re-implemented a directory scan to read them. The arrays were built and shipped.

The entry is now to carry a body — a paragraph on the building, written in
Japanese, the same kind of prose the visit records already hold as Markdown. A
body is the one thing a TypeScript array is worst at: prose inside a template
literal reads and edits worse than a Markdown file, and it earns none of the
type-checking that justified the array, because the type of a body is "a
string." Once an entry has a body, the source links belong beside it as ordinary
Markdown links, not a separate structured array a component reassembles.

The array's two advantages do not survive the body. The two-places problem that
killed the registry does not recur without one: the Markdown file is the single
source, with no generation step behind it. And Astro runs `catalogSchema` (Zod)
over an entry's frontmatter at build whether the entry began as an array element
or a file, so "the build passes" still means "the schema holds." What a file
gives up is narrower: editor-time completion while authoring frontmatter, and a
typed bare import for the two consumers that read the catalog outside Astro.

## Decision

The catalog is a Markdown collection under `src/content/`, loaded by Astro's
`glob` loader — one file per entry, its frontmatter validated by `catalogSchema`
and its body rendered through `<Content />`. There is no registry, no importer,
and no data module generated from anything; the file is the source.

- **The filename is the id.** The glob loader slugifies the filename into the
  id, so the id is not a frontmatter field and uniqueness is enforced by the
  filesystem. The id is a stable slug carrying no number: the official number is
  display and sort only, kept out of the id because renumbering would otherwise
  break every URL and every visit reference. (This is the same mechanism the
  visit records use — the filename is the id there too.)
- **Excluded rows are a separate collection.** Official rows with no building
  live as Markdown in a subdirectory the main `*.md` pattern does not reach, so
  they never enter the `projects` collection. The collection's schema stays a
  single shape and no consumer narrows — no `z.xor` putting both shapes in one
  collection and forcing every reader to filter and narrow.
- **An entry's links are in its body.** There is no `sources` field; the links
  are written as Markdown links in the prose, drawn from no closed set.
- **`location` is stored and `municipality` derived from it**, so a place is
  written down once — a Zod `.transform()` in the schema.

## Consequences

- An entry is a Markdown file with a body, editable on its own and through
  GitHub's web UI. Its links read in place instead of being reassembled by a
  component.
- Id uniqueness is free from the filesystem, so no test guards it. Astro's array
  loader would have stored entries by id and silently overwritten a duplicate;
  the glob loader keying on filenames cannot.
- Entry URLs are `/projects/<slug>`.
- The two consumers that read the catalog outside Astro — the catalog test and
  the e2e helper — cannot use `getCollection` (it does not run in plain Vitest or
  Playwright), so they read the files and parse frontmatter themselves.
- Source labels come from no closed set, so the same link can be spelled more
  than one way across the catalog; a uniform "出典" section is a writing
  convention, not a schema guarantee.
- A new official number, or a corrected address, surfaces only when a human
  looks — nothing checks the entries against the prefecture's pages. The one tool
  left is `bun run geocode`, which prints coordinates for an address.
