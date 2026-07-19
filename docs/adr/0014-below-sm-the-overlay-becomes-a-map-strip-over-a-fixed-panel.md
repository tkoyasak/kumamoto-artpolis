# Below sm, the overlay becomes a map strip over a fixed table panel

Decided 2026-07-19.

## Context

The site had no real below-`sm` layout: the 55rem fixed-width home table forced
horizontal scrolling on phones, the fullscreen map was only reachable by
scrolling past ~130 rows, and every island linkage (row ↔ marker highlight) was
hover-only, which touch devices don't have. Candidate shapes for the phone
layout: keep the overlay and fit the table into the width; a list/map toggle; a
draggable bottom sheet; a card list replacing the table.

## Decision

Keep the overlay — the map layer stays a fullscreen `fixed` layer under
transparent content — but below `sm`:

- The top `40svh` stays open as the map's interactive strip; the sortable
  islands render as a **fixed bottom panel** (`top-[40svh]` → bottom) with its
  own scroll and a sticky header. Backgrounds stay off, as on desktop — the
  map shows through everything. Page scroll is gone on the fullscreen-map
  pages.
- The sticky header gets no background either: **rows fade out** (a
  scroll-driven animation) as they slide under its band, so header and row
  text never collide. A translucent white header bar was tried and rejected
  for painting a chrome strip over the map.
- Columns collapse to a subset (`*_MOBILE_COLS` in `table.ts`): No. / Name /
  Year for entry tables, Date / Name for status. The same subset applies to the
  detail tables, keeping the morph pair's shapes identical — the reason a card
  list and a sticky-Name column were rejected.
- The three nav links render as one **fixed horizontal bar** on every page; the
  interleaved links (which carry the nav morph names) are `display:none` there.
- The initial `fitBounds` pads its bottom by the panel height, so every marker
  starts inside the visible strip.
- On `(hover: none)` devices a marker's **first tap plays the hover role**
  (ring + row outline + scroll the row into view) and its second tap navigates;
  a background tap clears. Rows keep single-tap navigation. A toggle or bottom
  sheet would have hidden one island behind the other and killed this linkage;
  both also cost a new client-state seam against `transition:persist`.

## Consequences

- Desktop is untouched; everything mobile rides on `max-sm:`/`sm:` variants
  plus two runtime checks (`(hover: none)`, panel `position: fixed`).
- The camera-never-moves rule (ADR 0007) and the detail pages' 256px crop stay
  as-is on phones.
- Dropping a column below sm means editing `*_COL_WIDTHS` and `*_MOBILE_COLS`
  together (pinned by a unit test).
- The touch pipeline needed two maplibre workarounds — docs/findings/0006.
- Building it surfaced further quirks, frozen in docs/findings/0005 (fixed
  tables vs `display:none` cells), 0007 (Tailwind's scanner vs template
  boundaries), and 0008 (lightningcss vs `animation-timeline`).
