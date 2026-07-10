import type { Category } from "./routes.ts";

export const MAP_MARKERS_URL = "/map-markers.json";

// Explicit id/persist name — Astro's auto persist ids collided (docs/issues/0003).
export const MAP_LAYER_ID = "map-layer";

// Shared by the layout's server-side hide and the map script, so they can't drift.
export const FULLSCREEN_MAP_PATHS: readonly string[] = ["/", "/status"];

// global.css's --color-project/--color-kap92 must match (pinned by tests/css-contract.test.ts).
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
