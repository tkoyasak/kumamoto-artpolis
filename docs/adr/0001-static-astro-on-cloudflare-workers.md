# Static Astro on Cloudflare Workers

Decided 2026-06-10.

## Context

This is a catalog site: entries and visit records are Markdown, and every page
is derivable at build time — there is no auth, no mutation, no per-request data.
The project started on TanStack Start, a full-stack React framework that ships a
server runtime on Cloudflare Workers and brings a React client runtime with it;
nothing in the site needed either.

## Decision

Build with Astro in static (SSG) mode — every page prerendered, no server
runtime, no adapter — and deploy to Cloudflare Workers static assets, which serve
`dist/` directly and fall back to the prerendered 404 page for unknown paths
(`not_found_handling`).

## Consequences

- TanStack Start is rejected: a server runtime and a mandatory React client
  runtime for a site with no server needs, and no equivalent of Astro's content
  collections for the Markdown that is this site's data.
- With no server runtime, every dynamic behavior is a client-side island;
  anything needing runtime compute (signed or private R2 access, API endpoints)
  would mean adding the `@astrojs/cloudflare` adapter.
- Photos are public R2 URLs referenced from Markdown — there is no runtime to
  sign or proxy them.
