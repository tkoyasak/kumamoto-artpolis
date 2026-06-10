# content

Site content (Astro content collections). The schema is defined in `src/content.config.ts`.

- `projects/` — Art Polis projects (the buildings themselves)
- `status/` — daily visit records (**the source of truth for visits**)

---

## projects/

One Markdown file per project.

- **Filename = the Art Polis number** (e.g. `1.md`) → `/projects/1`
- **Frontmatter** = metadata, **body** = the building's description
- Do not write visit dates here; they are derived automatically from `status/`

```yaml
---
number: 1 # Art Polis number (matches the filename)
name: 熊本県営保田窪第一団地
architects: # one or more
  - 山本理顕
lat: 32.8016 # latitude (entered by hand)
lng: 130.7637 # longitude (entered by hand)
completedYear: 1991
municipality: 熊本市
use: 集合住宅 # one of the values below
---
Write the description (Markdown) here.
```

Allowed `use` values: `公共施設` / `集合住宅` / `学校` / `公園` / `橋梁` / `駅` / `その他`
(to add more, extend the enum in `src/content.config.ts`)

---

## status/

One Markdown file per day. **The source of truth for visits.**

- **Filename = the date `YYYY-MM-DD`** (e.g. `2025-11-03.md`) → `/status/2025-11-03`
- **`projects` in the frontmatter** lists the projects visited that day (reference the `projects/` filenames = numbers, as strings)
- **Body** = the day's notes and photos (reference photos as public R2 URLs)
- Writing an entry here automatically gives the referenced projects their "visited date / visited" state

```yaml
---
projects: # projects visited that day (several allowed)
  - "1"
  - "3"
---
Write the day's notes here.

![中庭](https://media.example.com/2025-11-03/hodakubo-1.jpg)
```

Referencing a non-existent project fails the build (validated by `reference`).
