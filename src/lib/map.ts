// The prerendered endpoint (src/pages/map-data.json.ts) the map island fetches
// its markers from, when the map first initializes.
export const MAP_DATA_URL = "/map-data.json";

// Minimal shape served to the vanilla map island (only entries with coordinates).
export type MapProject = {
  href: string; // shared key with the table row
  name: string;
  category: "project" | "kap92";
  completedYear: number | null;
  visited: boolean;
  lat: number;
  lng: number;
};
