# Visit dates live in the status collection, not on entries

Decided 2026-07-05.

## Context

The site records visits to catalog entries, and an entry's visit history must be
shown on its page. Storing dates on the entry files would duplicate the same fact
everywhere a visit touches and desync silently. An earlier version derived dates
from one `status` record per date, listing every entry seen that day — but a
multi-valued entry list cannot be schema-enforced down to one catalog collection,
and a visit had no page or prose of its own.

## Decision

Visits are recorded as one `status` record per visit (`<date>-<HHMM>.md`), each
referencing exactly one entry (`project` XOR `kap92`, schema-enforced); entries do
not store their own visit dates. A record's id is its datetime, so a visit's date
— and every entry's visit history — is derived from the status collection
(`getVisitsByEntry()`), never written onto the entry files: visiting an entry
means adding a record, not editing the entry.

## Consequences

- Per-date records (the earlier version) are rejected: splitting to one record per
  visit gives each visit its own page (`/status/<id>`) and body (notes, photos),
  and makes the entry reference single-valued and schema-enforceable.
- Storing dates on entries is rejected: the status collection is the single source
  of truth, so a visit date cannot desync between an entry and its records.
- The trade-off: answering "when was entry X visited?" means scanning the status
  collection rather than reading a field on the entry.
