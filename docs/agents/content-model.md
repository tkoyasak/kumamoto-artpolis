# Content model

## The catalog

The two catalog collections are hand-written TypeScript, loaded straight into
Astro. There are no catalog Markdown files.

- **`src/data/projects.ts`** — Artpolis commissioned new builds. Also exports
  `excluded`: official-list rows with no visitable building. They are not
  entries and never reach a collection.
- **`src/data/kap92.ts`** — KAP'92 selected existing buildings.
- **`src/content.config.ts`** holds `catalogSchema`, which both collections use
  and which the data is typed against (`EntryInput`).

An entry is `id`, `number`, `name`, `location`, `lat`, `lng`, `architects`,
`use`, `sources`, and an optional `completedYear`. `use` is free text.

- **`sources`** — the links the detail page shows, in order. `title` comes from
  a closed set (`SOURCE_TITLES`).
- **`municipality`** — derived from `location` (`src/lib/address.ts`), not
  stored. A ward-less 熊本市 address fails the build.
- An entry has no body.

## Visit records

`src/content/status/` is Markdown, one file per visit (`<date>-<HHMM>.md`); the
body holds the notes and photos. The frontmatter references exactly one entry
via `project` XOR `kap92`, enforced by the schema.

## Ownership

The entries are hand-curated. No tool writes them, and nothing checks them
against the prefecture's pages.

## Identity

**`id` is a field**: a stable, human-readable slug in lowercase, digits and
dashes. It is the URL (`/projects/<id>`) and how `status` references an entry;
the dynamic routes are all `[id].astro`. It carries no official number —
`number` is display and sort only, and a split official row is several entries
sharing one.

`tests/catalog-data.test.ts` pins id uniqueness and the URL shape.

Visit records keep filename == id == URL; their ids are datetimes.

## Visit dates

**`status` is the source of truth for visit dates.** Entries don't store their
own; `getVisitsByEntry()` (`src/lib/visits.ts`) derives them for both
collections, keyed by entry href (`/projects/<id>`, `/kap92/<id>`) so ids can't
collide across collections.

## Photos

External URLs in visit-record Markdown bodies — currently placeholders
(`media.example.com`); an R2 bucket is planned.
