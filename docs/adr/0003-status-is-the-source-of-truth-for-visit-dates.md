# Visit dates live in the status collection, not on entries

Visits are recorded as one `status` record per date, each listing the entries
seen that day; entries do not store their own visit dates. A day's outing
naturally covers several entries, so recording visits by date avoids duplicating
(and keeping in sync) the same date across every entry visited — per-entry visit
dates are derived from the status records instead.

The trade-off: answering "when was entry X visited?" means scanning the status
collection rather than reading a field on the entry.
