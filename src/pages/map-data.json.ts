import type { APIRoute } from "astro";

import { getEntryRows, toMapEntries } from "../lib/entries.ts";

// Prerendered to /map-data.json (MAP_DATA_URL in src/lib/map.ts): the marker
// data for the persisted map island. One shared, cacheable asset fetched when
// the map first initializes, instead of inline JSON duplicated into every page.
export const GET: APIRoute = async () =>
  new Response(JSON.stringify(toMapEntries(await getEntryRows())));
