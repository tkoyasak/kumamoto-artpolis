import type { Category } from "./routes.ts";

export const MAP_MARKERS_URL = "/map-markers.json";

// The persisted map layer's DOM id and `transition:persist` name. Pinned
// explicitly: Astro's auto-generated persist ids are position-dependent and
// were colliding.
export const MAP_LAYER_ID = "map-layer";

// Shared by the layout's server-side visibility (Base.astro) and the map
// script's per-navigation visibility (EntriesMap.astro), so the two can't
// drift apart.
export const FULLSCREEN_MAP_PATHS: readonly string[] = ["/", "/status"];

// Marker colors per collection. global.css's --color-project / --color-kap92
// must hold the same values (pinned by tests/css-contract.test.ts).
export const MARKER_COLORS: Record<Category, string> = {
  project: "#ff5031",
  kap92: "#0009f3",
};

// One marker per entry, served to the vanilla map island.
export type MapEntry = {
  href: string; // shared key with the table row
  name: string;
  category: Category;
  visited: boolean;
  lat: number;
  lng: number;
};
