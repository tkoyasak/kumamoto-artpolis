// The id/URL-derived facts of the site, in one place (client-safe: no
// astro:content imports). These encode the two core invariants:
// ADR 0002 — the filename is the entry id, so an entry's href is built from
// its collection + id; ADR 0003 — a status id is an ISO datetime whose first
// 10 characters are the visit date.

// The two catalog collections. Collection names are plural; the per-row
// category tag (row outline / marker color) is the singular form.
export type CatalogCollection = "projects" | "kap92";
export type Category = "project" | "kap92";

export const categoryOf = (collection: CatalogCollection): Category =>
  collection === "projects" ? "project" : "kap92";

// /projects/<id> or /kap92/<id>. Doubles as the site-wide row/marker key:
// collection is part of the href, so ids can't collide across collections.
export const entryHref = (entry: { collection: CatalogCollection; id: string }): string =>
  `/${entry.collection}/${entry.id}`;

// /status/<id> — one visit's record page.
export const statusHref = (id: string): string => `/status/${id}`;

// A status id is an ISO datetime (YYYY-MM-DD-HHMM); its date part is the visit date.
export const statusDate = (id: string): string => id.slice(0, 10);

// Strip the trailing slash that Cloudflare's auto-trailing-slash redirect adds
// on direct loads of directory-built pages (/projects/<id>/), so live paths
// compare equal to the extensionless hrefs built above.
export const normalizePath = (path: string): string => path.replace(/\/$/, "") || "/";
