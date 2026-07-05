# The filename is the entry id

Each Project / KAP'92 building Markdown file is named by its id (`<id>.md`,
e.g. `kumamoto-castle.md`): a human-readable name, chosen once and kept stable.
The glob loader derives the entry id from the filename, so the id is the public
URL (`/projects/<id>`) and the key by which visit records reference an entry.
The official `number` stays a frontmatter field, used only for display and
sorting.

Keeping a chosen name (not the number) as the id makes URLs human-readable and
stable even if the official numbering changes, and decouples visit references
from the number — renumbering an entry never touches its id or the records that
point at it.

The id lives in exactly one place, the filename. An earlier version carried a
`slug` frontmatter field (files were named by `number`, `1.md`) that the loader
special-cased into the id; naming the file by the chosen name drops that
duplication and the file-name-≠-id indirection. `number` is not put in the
filename on purpose: doing so would fold it into the id and re-couple URLs and
references to it.

The id is the only identifier concept, across every collection: `status`
records follow the same filename == id == URL mechanism (their ids are
datetimes rather than names), and the dynamic routes are all `[id].astro`.
"Slug" — the earlier name for a catalog entry's id — is retired (issue #16);
the glossary marks it avoided.
