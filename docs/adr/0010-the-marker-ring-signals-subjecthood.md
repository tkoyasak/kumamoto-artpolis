# The marker outline ring signals subjecthood, not map presence

Decided 2026-07-10.

## Context

The table and map islands share hover through `$hovered` (ADR 0003): a row hover
rings its marker and a marker hover outlines its rows. The obvious rule — ring a
marker whenever it is highlighted — conflates two different things: an entry being
the _subject_ of the current interaction, and an entry merely _appearing on the
map_ as context.

On `/status` the timeline's subject is the visit, and the visited entry is
context; ringing that entry's marker on every row hover made the map compete with
the timeline. On `/status/<id>` the page's subject is the visit record — the entry
is shown only as context, with the map clipped down to its marker — so a resting
ring there said "this is the subject" of a page whose subject it is not.

## Decision

The marker outline ring means "this entry is the subject of the current
interaction". It fires on a direct marker hover (anywhere), a home-catalog hover
of the entry's _own_ row, the entry's own detail page at rest, and an in-flight
navigation to it. It is suppressed where the entry is only context: a `/status`
visit-row hover (the row href differs from the marker key) and a `/status/<id>`
page at rest (the page path differs from the focus href) — though hovering that
marker directly still rings it. The whole matrix lives in `isMarkerOutlined`
(`src/lib/stores.ts`), pinned by its unit test.

The row↔marker linkage itself holds everywhere, including the static detail rows:
each non-subject row's marker key defaults to its own href, so `/status/<id>`'s
visited-entry row and its marker light each other exactly like the home table —
only the ring's _subjecthood_ gate differs, not the linkage.

## Consequences

- "Ring wherever a marker is highlighted" is rejected: it equated map presence
  with subjecthood and let the `/status` map compete with the timeline it
  illustrates.
- The detail-page clip is orthogonal and untouched — it keys off the focus
  coordinates, not the ring (ADR 0007) — so a `/status/<id>` marker stays cropped
  and visible while unringed.
- The cost: the ring's condition is now a small matrix over (hover source × page
  context) rather than a single "is this marker highlighted" flag, carried by
  `isMarkerOutlined` and its test rather than read off the store inline.
- Marker→row highlighting is deliberately kept off the entry pages' visit lists.
  There the one marker is the page's own subject and every visit row points back
  at it, so a marker hover would outline the entire list — the entry's own history
  — as noise rather than signal. `StatusDetailTable` therefore sets no
  `markerHref`, letting each row key to its own href (never a marker key). The
  `/status` timeline island still links its rows, because there each points at a
  _different_ visited entry.
