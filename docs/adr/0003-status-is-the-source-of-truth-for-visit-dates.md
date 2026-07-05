# Visit dates live in the status collection, not on entries

Visits are recorded as one `status` record per visit (`<date>-<HHMM>.md`), each
referencing exactly one entry (`project` XOR `kap92`, schema-enforced); entries
do not store their own visit dates. A record's id is its datetime, so a visit's
date — and every entry's visit history — is derived from the status collection
(`getVisitsByEntry()`), never written onto the entry files: visiting an entry
means adding a record, not editing the entry.

An earlier version recorded one record per date, listing every entry seen that
day. Splitting to one record per visit gives each visit its own page
(`/status/<id>`) and body (notes, photos), and makes the entry reference
single-valued and schema-enforceable.

The trade-off: answering "when was entry X visited?" means scanning the status
collection rather than reading a field on the entry.
