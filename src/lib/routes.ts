// The id/URL-derived facts of the site, in one place (client-safe: no
// astro:content imports). ADR 0002: the filename is the entry id; ADR 0003:
// a status id is an ISO datetime.

export type CatalogCollection = "projects" | "kap92";
export type Category = "project" | "kap92";

export const categoryOf = (collection: CatalogCollection): Category =>
  collection === "projects" ? "project" : "kap92";

// Doubles as the site-wide row/marker key.
export const entryHref = (entry: { collection: CatalogCollection; id: string }): string =>
  `/${entry.collection}/${entry.id}`;

export const statusHref = (id: string): string => `/status/${id}`;

// A status id is YYYY-MM-DD-HHMM; its date part is the visit date.
export const statusDate = (id: string): string => id.slice(0, 10);

// Strip the trailing slash that Cloudflare's auto-trailing-slash redirect adds
// on direct loads of directory-built pages (/projects/<id>/), so live paths
// compare equal to the extensionless hrefs built above.
export const normalizePath = (path: string): string => path.replace(/\/$/, "") || "/";
