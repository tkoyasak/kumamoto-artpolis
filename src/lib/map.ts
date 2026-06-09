// Minimal project shape passed to the client-side map island. Kept free of
// `astro:content` so it can be imported (type-only) inside the island script.
export type MapProject = {
  number: number;
  name: string;
  lat: number;
  lng: number;
  completedYear: number;
  visited: boolean;
};
