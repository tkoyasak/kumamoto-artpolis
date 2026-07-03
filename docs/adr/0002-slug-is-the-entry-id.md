# Slug is the entry id; the file is named by slug

Each Project / KAP'92 building Markdown file is named by its slug
(`<slug>.md`, e.g. `kumamoto-castle.md`). The glob loader derives the
entry id from the filename, so the slug is the entry id: the public URL
(`/projects/<slug>`) and the key by which visit records reference an entry. The
official `number` stays a frontmatter field, used only for display and sorting.

Keeping the slug (not the number) as the id makes URLs human-readable and stable
even if the official numbering changes, and decouples visit references from the
number — renumbering an entry never touches its id or the records that point at
it.

The slug lives in exactly one place, the filename. An earlier version carried a
`slug` frontmatter field (files were named by `number`, `1.md`) that the loader
special-cased into the id; naming the file by the slug drops that duplication and
the file-name-≠-id indirection. `number` is not put in the filename on purpose:
doing so would fold it into the id and re-couple URLs and references to it.
