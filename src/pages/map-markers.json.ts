import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

import { isActive } from "../lib/catalog.ts";
import type { MapEntry } from "../lib/map.ts";
import { categoryOf, entryHref } from "../lib/routes.ts";
import { getVisitsByEntry } from "../lib/visits.ts";

// Prerendered to /map-markers.json: one shared, cacheable asset for the
// persisted map island, instead of inline JSON duplicated into every page.
// The array is in marker stacking order — the map script registers markers in
// array order and later ones paint on top, so projects sit above KAP'92.
export const GET: APIRoute = async () => {
  const projects = await getCollection("projects");
  const kap92 = await getCollection("kap92");
  const visits = await getVisitsByEntry();

  const markers: MapEntry[] = [...kap92, ...projects].filter(isActive).map((entry) => {
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
