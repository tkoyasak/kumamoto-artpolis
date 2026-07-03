# Static Astro on Cloudflare Workers

Every page of this catalog can be prerendered, so the site is built with Astro in
static (SSG) mode — no server runtime — and deployed to Cloudflare Workers static
assets, which serve `dist/` directly and fall back to a prerendered 404 page for
unknown paths.
