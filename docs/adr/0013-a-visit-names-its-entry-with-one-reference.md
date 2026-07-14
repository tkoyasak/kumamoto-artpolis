# A visit names its entry with one reference

Decided 2026-07-15.

## Context

ADR 0009 gave a status record two optional frontmatter fields, `project` and
`kap92`, one of which had to be set — the collection was carried by the choice
of key. "Exactly one" was then a constraint to validate: a `.refine()` counted
the set fields, and the schema's output type stayed a flat object with both
fields optional. So every consumer re-derived the reference (`data.project ??
data.kap92`) and had to handle a "neither" case the schema had already made
impossible, guarded by a runtime throw and a test that mocked its way past the
schema to reach it.

Zod can express the constraint directly — `z.union` is an OR that a stripping
object schema lets both branches match, but `z.xor` (zod 4) demands exactly one
branch succeed. That would enforce the rule and give a union output type. It
also leaves the rule to be enforced at all, which is the weaker move: a shape
that cannot express two references needs no rule.

`reference(collection)` (Astro) accepts either a bare id string, which it tags
with the collection unchecked, or a `{ collection, id }` object, whose
collection it verifies against its own. Against a bare id, both branches of a
union match — every record would name both collections — so the object form is
what makes two branches mutually exclusive.

## Decision

A status record names its entry in one field, whose value is a
collection-qualified reference:

```yaml
entry:
  collection: kap92
  id: kumamoto-castle
```

The schema is `z.xor` over the two `reference()`s. Naming two entries is not a
rejected input but an unrepresentable one: there is a single field to write.
`z.xor` remains as the seam where a reference that names no known collection is
rejected.

## Consequences

- Consumers read `visit.data.entry`, a `{ collection, id }` union that
  `getEntry` takes as is. The "no reference" case is gone from the type, and
  with it its runtime guard and that guard's test.
- The frontmatter costs the author a nested mapping instead of one line, and
  names the collection as a value rather than a key.
- Adding a third catalog collection extends the `z.xor` by one branch and
  changes no record already written.
- `reference()` still never checks that the entry exists; a dangling reference
  is caught by `getVisitedEntry()`, which throws.
