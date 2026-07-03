# Slug is the entry id; the file is named by number

Each Project / KAP'92 building Markdown file is named by its official `number`
(`1.md`), but the glob loader is configured so the frontmatter `slug` becomes the
entry id. The slug — not the number — is therefore the public URL
(`/projects/<slug>`) and the key by which visit records reference an entry, while
the number is used only for display and sorting.

This keeps URLs human-readable and stable even if the official numbering changes,
at the cost of an indirection (file name ≠ id) that has to be kept in mind when
reading the code.
