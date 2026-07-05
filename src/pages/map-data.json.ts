import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

import type { MapEntry } from "../lib/map.ts";
import { categoryOf, entryHref } from "../lib/routes.ts";
import { getVisitsByEntry } from "../lib/visits.ts";

// Prerendered to /map-data.json (MAP_DATA_URL in src/lib/map.ts): the marker
// data for the persisted map island. One shared, cacheable asset fetched when
// the map first initializes, instead of inline JSON duplicated into every page.
// The array is already in marker stacking order: the map script registers markers
// in array order and later ones paint on top, so KAP'92 (first, first→last) sits
// under projects (last, first→last). A marker is `visited` when the entry has any
// status record.
export const GET: APIRoute = async () => {
  const projects = await getCollection("projects");
  const kap92 = await getCollection("kap92");
  const visits = await getVisitsByEntry();

  const markers: MapEntry[] = [...kap92, ...projects].map((entry) => {
    const href = entryHref(entry);
    return {
      href,
      name: entry.data.name,
      category: categoryOf(entry.collection),
      visited: visits.has(href),
      lat: entry.data.lat,
      lng: entry.data.lng,
    };
  });
  return new Response(JSON.stringify(markers));
};
