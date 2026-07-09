# Routing

Every page is prerendered (static Astro on Cloudflare Workers assets).

- `/` — home (table + fullscreen map)
- `/projects/<id>`, `/kap92/<id>` — prerendered detail pages (`getStaticPaths`)
- `/status`, `/status/<id>` — visit timeline (also fullscreen map) / one visit's record (id is a datetime)
- `/about` — about page
- `/404` — Workers assets serve it for unknown paths (`not_found_handling`)
- `/map-markers.json` — prerendered endpoint of the map marker data
