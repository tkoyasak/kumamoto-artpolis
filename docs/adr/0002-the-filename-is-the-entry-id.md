# The filename is the entry id

## Status

Accepted (2026-07-05).

## Context

Each catalog entry needs one stable public identifier: it is the URL
(`/projects/<id>`) and the key by which visit records reference the entry.
The candidates were the official `number` or a human-readable chosen name,
and the name could live either in frontmatter or in the filename. An earlier
version named files by `number` (`1.md`) and carried a `slug` frontmatter
field that the loader special-cased into the id — the id then lived in two
places, with a file-name-≠-id indirection to keep in mind when reading the
code.

## Decision

Each Project / KAP'92 building Markdown file is named by its id (`<id>.md`,
e.g. `kumamoto-castle.md`): a human-readable name, chosen once and kept
stable. The glob loader derives the entry id from the filename, so the id is
the public URL and the reference key, and it lives in exactly one place. The
official `number` stays a frontmatter field, used only for display and
sorting.

The id is the only identifier concept, across every collection: `status`
records follow the same filename == id == URL mechanism (their ids are
datetimes rather than names), and the dynamic routes are all `[id].astro`.

## Consequences

- Naming files by `number` is rejected: it would fold the number into the id
  and couple URLs and visit references to the official numbering —
  renumbering an entry would break both. As a frontmatter field, renumbering
  never touches an id or the records that point at it.
- The `slug` frontmatter field and its loader special-case are gone. "Slug"
  — the earlier name for a catalog entry's id — is retired (issue #16); the
  glossary marks it avoided.
- Renaming an entry file is a breaking change (its URL and every status
  reference), so filenames must be kept stable.
