# Routing

Every page is prerendered (static Astro on Cloudflare Workers assets,
→ `docs/adr/0001`).

- `/` — home (table + map)
- `/projects/<id>`, `/kap92/<id>` — prerendered detail pages (`getStaticPaths`)
- `/status`, `/status/<id>` — visit timeline / one visit's record (id is a datetime)
- `/about`; `/404` — Workers assets serve it for unknown paths (`not_found_handling`)
- `/map-markers.json` — prerendered endpoint of the map marker data
