import type { Category } from "./routes.ts";

// The prerendered endpoint (src/pages/map-data.json.ts) the map island fetches
// its markers from, when the map first initializes.
export const MAP_DATA_URL = "/map-data.json";

// The persisted map layer. Doubles as its DOM id and its `transition:persist` name
// (Base.astro), and the id the map island toggles visibility on (EntriesMap.astro).
// Pinning an explicit persist name keeps it stable across pages — Astro's
// auto-generated persist ids are position-dependent and were colliding.
export const MAP_LAYER_ID = "map-layer";

// Pages that show the persisted map fullscreen with every marker. Shared by
// the layout's server-side visibility (Base.astro) and the map script's
// per-navigation visibility (EntriesMap.astro), so the two can't drift apart.
export const FULLSCREEN_MAP_PATHS: readonly string[] = ["/", "/status"];

// Minimal shape served to the vanilla map island (one marker per entry):
// `category` colors the marker, `visited` fills it, `name` labels it.
export type MapEntry = {
  href: string; // shared key with the table row
  name: string;
  category: Category;
  visited: boolean;
  lat: number;
  lng: number;
};
