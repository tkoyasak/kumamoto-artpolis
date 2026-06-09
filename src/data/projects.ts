/** Primary function category of a project. */
export type Use = "公共施設" | "集合住宅" | "学校" | "公園" | "橋梁" | "駅" | "その他";

/** A single Art Polis project. */
export type Project = {
  /** Official Art Polis sequential number. Used as the URL key (/projects/<number>). */
  number: number;
  /** Project name. */
  name: string;
  /** Architect(s) responsible for the design. */
  architects: readonly string[];
  /** Latitude (WGS84). */
  lat: number;
  /** Longitude (WGS84). */
  lng: number;
  /** Year of completion. */
  completedYear: number;
  /** Municipality where the project is located. */
  municipality: string;
  /** Primary function category. */
  use: Use;
  /** Dates the project was visited, each "YYYY-MM-DD". Empty means not visited yet. */
  visitedDates: readonly string[];
};

// SAMPLE DATA — `number`, coordinates, and completion years are approximate.
// Verify against official sources and replace before relying on them.
const data = [
  {
    number: 1,
    name: "熊本県営保田窪第一団地",
    architects: ["山本理顕"],
    lat: 32.8016,
    lng: 130.7637,
    completedYear: 1991,
    municipality: "熊本市",
    use: "集合住宅",
    visitedDates: ["2025-11-03"],
  },
  {
    number: 2,
    name: "八代市立博物館 未来の森ミュージアム",
    architects: ["伊東豊雄"],
    lat: 32.505,
    lng: 130.601,
    completedYear: 1991,
    municipality: "八代市",
    use: "公共施設",
    visitedDates: [],
  },
  {
    number: 3,
    name: "熊本県立装飾古墳館",
    architects: ["六角鬼丈"],
    lat: 33.022,
    lng: 130.689,
    completedYear: 1992,
    municipality: "山鹿市",
    use: "公共施設",
    visitedDates: [],
  },
  {
    number: 4,
    name: "苓北町民ホール",
    architects: ["阿部仁史"],
    lat: 32.464,
    lng: 130.026,
    completedYear: 2001,
    municipality: "苓北町",
    use: "公共施設",
    visitedDates: [],
  },
] as const satisfies readonly Project[];

/** All projects, sorted by official Art Polis number (ascending). */
export const projects: Project[] = [...data].sort((a, b) => a.number - b.number);

/** Whether the project has been visited at least once. */
export function isVisited(project: Project): boolean {
  return project.visitedDates.length > 0;
}

/** The most recent visit date ("YYYY-MM-DD"), or null if never visited. */
export function latestVisitedDate(project: Project): string | null {
  if (project.visitedDates.length === 0) return null;
  return project.visitedDates.reduce((a, b) => (a > b ? a : b));
}
