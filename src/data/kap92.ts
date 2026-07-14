import type { EntryInput } from "../content.config.ts";

// The KAP'92 catalog, numbered by the prefecture's list:
// <https://www.pref.kumamoto.jp/soshiki/115/4477.html>
export const kap92 = [
  {
    id: "kumamoto-castle",
    number: 1,
    name: "熊本城",
    location: "熊本市中央区本丸1-1",
    lat: 32.806,
    lng: 130.706,
    architects: ["加藤清正"],
    completedYear: 1607,
    use: "城郭",
    sources: [],
  },
] satisfies EntryInput[];
