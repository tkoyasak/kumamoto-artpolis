// Minimal shape passed to the vanilla map island (only entries with coordinates).
export type MapProject = {
  href: string; // shared key with the table row
  name: string;
  category: "project" | "kap92";
  completedYear: number | null;
  visited: boolean;
  lat: number;
  lng: number;
};
