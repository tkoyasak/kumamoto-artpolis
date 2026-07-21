# Content model

## The catalog

The two catalog collections are Markdown, one file per entry, read through
Astro's glob loader. There is no data module and no generation step; the file is
the source (docs/adr/0012).

- **`src/content/projects/`** — Artpolis commissioned new builds. Its
  `_excluded/` subdirectory holds the `excluded` collection: official-list rows
  with no visitable building, which the projects `*.md` pattern doesn't reach, so
  they never become entries. An excluded file is `number`, `name`, `reason`.
- **`src/content/kap92/`** — KAP'92 selected existing buildings.
- **`src/content.config.ts`** holds `catalogSchema`, which both catalog
  collections use to validate frontmatter at build.

An entry's frontmatter is `number`, `name`, `location`, `lat`, `lng`,
`architects`, `use`, and an optional `completedYear`. `use` is free text. Its
body is Markdown, rendered on the detail page through `<Content />`.

- **Links live in the body**, written as Markdown links (by convention under a
  `## 出典` heading), not a frontmatter field.
- **`lat`/`lng`** are bounded to Kumamoto Prefecture's bounding box; a coordinate
  outside it fails the build.
- **`municipality`** — derived from `location` (`src/lib/address.ts`), not
  stored. A ward-less 熊本市 address fails the build.

## Visit records

`src/content/status/` is Markdown, one file per visit (`<date>-<HHMM>.md`); the
body holds the notes and photos. The frontmatter names one entry in a single
`entry` field, a collection-qualified reference:

```yaml
entry:
  collection: kap92
  id: kumamoto-castle
```

There is one field, so a record cannot name two entries (docs/adr/0013).
`getEntry` takes `visit.data.entry` as is.

## Ownership

The entries are hand-curated. No tool writes them, and nothing checks them
against the prefecture's pages.

## Identity

**The filename is the id** (docs/adr/0008). The glob loader slugifies each entry's filename into
its id: a stable, human-readable slug in lowercase, digits and dashes. It is the
URL (`/projects/<id>`) and how `status` references an entry; the dynamic routes
are all `[id].astro`. It carries no official number — `number` is display and
sort only, and a split official row is several entries sharing one. Filename ==
id makes uniqueness a property of the filesystem.

`tests/catalog-data.test.ts` pins the id/URL shape and that no number is both
catalogued and excluded.

Visit records key the same way; their ids are datetimes.

## Visit dates

**`status` is the source of truth for visit dates** (docs/adr/0009). Entries don't store their
own; `getVisitsByEntry()` (`src/lib/visits.ts`) derives them for both
collections, keyed by entry href (`/projects/<id>`, `/kap92/<id>`) so ids can't
collide across collections.

## Photos

External URLs in visit-record Markdown bodies — currently placeholders
(`media.example.com`); an R2 bucket is planned.
