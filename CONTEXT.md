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

### Identity & keys

**Slug**:
An Entry's stable public identifier: its Markdown filename (`<slug>.md`), its URL
path (`/projects/<slug>`), and the key by which a visit references it.
_Avoid_: id (an internal framework term — for an Entry, the id _is_ the Slug, derived from the filename), permalink

**Number**:
An Entry's official catalog number (its Artpolis number, or its 1–46 place in
the KAP'92 prefecture list), stored as a frontmatter field. Used only for display
and ordering, never for identity or references.
_Avoid_: id, index

### Visits

**Visit record**:
A single day of visiting, identified by its date, listing the Entries seen that
day. The source of truth for when each Entry was visited.
_Avoid_: status (the technical collection/route name), visit log

**Visit date**:
The date that identifies a Visit record (`/status/<date>`). An Entry never stores
its own visit dates; they are always derived from Visit records.

**Visited**:
The derived state of an Entry that has at least one Visit record. Drives the
visited-or-not styling of its map marker.

### The explorer

**Explorer**:
The home page's interactive catalog view: a filterable, sortable listing of every
Entry shown beside a map, linked so that focusing an Entry in one highlights it in
the other.
