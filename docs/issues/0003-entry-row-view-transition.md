# Entry row: morph between home and detail pages

Status: **resolved** (2026-07-01)

Make the home table and the single-row detail-page table feel like _one
continuous table_: clicking a row animates it into the detail page, and returning
animates it back to its original slot. Built on the View Transitions API via
Astro's ClientRouter (already enabled for the map — see
[docs/issues/0002](0002-map-persist-across-navigation.md)).

## Background

- `/` renders `EntriesTable.tsx` — an interactive Preact + `@tanstack/react-table`
  island (`client:load`) listing every entry.
- `/projects/<id>` and `/kap92/<id>` render `EntryDetailTable.astro` — a static,
  same-styled table showing just that one entry as header + one row.

These are two different components, but visually identical rows — identical by
construction, since both render their markup through the shared `TableView.tsx`
(the island with a client directive, the static table without). A morph needs
the two snapshots to line up pixel-for-pixel; a single markup source is what
guarantees that instead of leaving it to coincidence. The goal is for the
navigation between them to look like the clicked row simply moving, not two
separate pages swapping.

The mechanism: when an element with the same `view-transition-name` exists in both
the outgoing and incoming snapshots, the browser pairs them and interpolates
position/size (a "morph"). So the work is entirely about **assigning matching
names to the right elements at the right time.**

## Shared names

`src/lib/transitions.ts` — its own module (no `astro:content` import) so it is
safe to import from the Preact island, unlike `entries.ts`:

- `ENTRY_HEAD_VT = "entry-head"` — the header row, named on both tables so
  it stays put across the swap.
- `rowTransitionName(href)` → `row-projects-<id>` — a stable per-row name
  keyed by href, so the home row and the detail row for the same entry pair up.
  Hrefs are unique site-wide, so the same function also names the `/status`
  timeline rows.

## Home → detail

- Row click switched from `window.location.href` (a full reload — no transition)
  to `navigate()` from `astro:transitions/client`, so it goes through the
  ClientRouter and a View Transition fires.
- Only the **clicked** row is tagged with its `view-transition-name`, set
  imperatively just before `navigate()` (`navigateWithRowMorph` in
  `src/lib/row-morph.ts`, shared by the home island, the static tables, and the
  map markers).
  Naming _every_ row up front would make each one its own transition group and
  animate them all independently — janky, and slow with many rows. The header
  carries `entry-head` permanently (it is unique per page, so that is fine).
- The detail table (`EntryDetailTable.astro`) names its header and its one row
  statically with `transition:name`.

Result: the clicked row and header morph; the rest of the table and the map
background cross-fade as the page root; the map itself is untouched (persisted).

## Detail → home (and the outline flourish)

Two problems on the way back:

1. **The destination row is anonymous.** The home table names rows only on click,
   so a fresh `/` has no row name to pair with the detail row — it would
   just fade instead of returning to its slot. Fix: an `astro:before-swap`
   listener (in `DetailTable.astro`) detects navigation _to_ `/`, finds the
   incoming row whose `data-row-href` matches the page we are leaving, and gives
   it the shared name. This works because the `client:load` island is
   server-rendered, so `event.newDocument` already contains the rows.

2. **Show the row's outline during the morph, but not after.** The detail row is
   always outlined; the home row is outlined only on hover. To keep the outline
   visible for the whole return trip and gone once it lands, the outline must be
   in the captured _new_ snapshot but not on the settled live row. So the
   `before-swap` handler adds the `outline` class to the incoming row (captured
   in the snapshot), then removes it from the live row on
   `viewTransition.ready` — which resolves _after_ the snapshot is taken but while
   the animation is still running. The temporary `view-transition-name` is cleaned
   off the live row on `viewTransition.finished` so it does not linger into the
   next navigation.

## Gotchas (things that bit us)

- **Preact hydration does not undo imperative DOM edits.** The first attempt just
  left the `outline` class on the incoming row expecting hydration to reset it —
  `hydrate()` trusts the SSR markup and does not patch attributes, so the outline
  stuck permanently. Hence the explicit removal on `ready`.
- **`transition:persist` auto-names are position-dependent.** Adding
  `transition:name` to the detail table shifted Astro's auto-generated persist id
  of the shared map layer on detail pages (`astro-…-1` on `/` vs `astro-…-3` on
  detail). The mismatch broke persistence, so returning home swapped in a fresh,
  uninitialized map layer — the map "disappeared". Fixed by pinning an explicit
  name: `transition:persist="map-layer"` in `Base.astro`.
- **Modified clicks** (⌘/Ctrl/Shift/Alt) on the row's name link fall through to
  the browser (open in new tab) instead of calling `navigate()`.
- `prefers-reduced-motion` and browsers without the View Transitions API are
  handled by the platform / an early return (the outline flourish is skipped when
  there is no `viewTransition`).

## Implementation

- `src/lib/transitions.ts`: shared names (`ENTRY_HEAD_VT`, `rowTransitionName`).
- `src/lib/row-morph.ts`: `navigateWithRowMorph(href)` — tag the row matching
  `data-row-href`, then `navigate()`. Client-only (imports
  `astro:transitions/client`), so it lives apart from `transitions.ts`.
- `src/components/EntriesTable.tsx`: calls `navigateWithRowMorph` on click,
  `data-row-href` for reverse matching, `entry-head` on the header.
- `src/components/DetailTable.astro`: static `transition:name`s on detail rows;
  the shared script upgrades row clicks to ClientRouter navigations, and its
  `astro:before-swap` handler names the destination row and runs the
  outline-only-during-morph logic for all three tables.
- `src/layouts/Base.astro`: `transition:persist="map-layer"` (stable persist id).
