# Kumamoto Artpolis

A static catalog of the buildings and structures of the Kumamoto Artpolis
architecture program, paired with a log of site visits.

## Language

### The program

**Kumamoto Artpolis** (KAP):
Kumamoto Prefecture's architecture initiative that commissions and showcases
distinctive public buildings and structures across the prefecture. The subject
matter this whole catalog documents.

**KAP'92**:
The 1992 selection of noteworthy _existing_ buildings recognized under the
program — distinct from the newly commissioned Projects.

### Catalog items

**Entry**:
A single item in the catalog: one architectural work with its own detail page.
The umbrella over Projects and KAP'92 buildings.
_Avoid_: item, record, building (too narrow — an Entry may be a bridge, park, or station)

**Project**:
A work newly commissioned by Kumamoto Artpolis. May be a building, bridge, park,
station, or other public structure.
_Avoid_: the software project/repository; "project" as a synonym for any Entry

**KAP'92 building**:
An existing building selected in the 1992 KAP'92 program, rather than newly
commissioned.
_Avoid_: calling it a Project

**Use**:
What an Entry is for — its function or building type (public facility, housing,
school, park, bridge, station, and so on).
_Avoid_: type, purpose

**Excluded marker**:
An official-list row that is not a visitable building (a plan, programme, or
unbuilt design), kept in the collection as a flagged file (`excluded: true`
with the reason) so the sync tool knows the Number is accounted for. Never
rendered on the site.
_Avoid_: calling it an Entry (it has no page, marker, or row)

### Identity & keys

**Id**:
An Entry's stable public identifier, derived from its Markdown filename
(`<id>.md`): the zero-padded official Number plus a human-readable name
(`NNNN-<slug>`), chosen once and kept stable. It is the URL path
(`/projects/<id>`) and the key by which a Visit record references the Entry.
Visit records are identified the same way — filename == id == URL — but their
ids are datetimes, not names.
_Avoid_: slug (retired — it named the same thing), permalink

**Number**:
An Entry's official catalog number (its Artpolis number, or its 1–46 place in
the KAP'92 prefecture list), stored as a frontmatter field. Used only for display
and ordering, never for identity or references.
_Avoid_: id, index

### Visits

**Visit record**:
A single visit to one Entry, identified by its datetime. Visit records are
collectively the source of truth for when each Entry was visited.
_Avoid_: status (the technical collection/route name), visit log

**Visit date**:
The calendar date of a Visit record, derived from its id. An Entry never stores
its own visit dates; they are always derived from Visit records.

**Visited**:
The derived state of an Entry that has at least one Visit record. Drives the
visited-or-not styling of its map marker.
