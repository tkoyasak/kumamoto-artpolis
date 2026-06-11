import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import { useEffect, useRef } from "preact/hooks";
import type { ExplorerRow } from "../lib/explorer.ts";

const STYLE_URL = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
const FALLBACK_CENTER: [number, number] = [130.7417, 32.7898]; // Kumamoto City
const FALLBACK_ZOOM = 8;

const VISITED_COLOR = "#e11d48"; // rose-600
const UNVISITED_COLOR = "#9ca3af"; // gray-400
const KAP92_COLOR = "#6366f1"; // indigo-500

function markerColor(row: ExplorerRow): string {
  if (row.category === "kap92") return KAP92_COLOR;
  return row.visitedDate ? VISITED_COLOR : UNVISITED_COLOR;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

type Props = {
  rows: ExplorerRow[];
  hovered: string | null;
  onHover: (href: string | null) => void;
};

// Controlled map: the parent owns the `hovered` key. maplibre is imported
// dynamically so it never runs during SSR.
export default function ProjectsMap({ rows, hovered, onHover }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const markers = useRef<Map<string, Marker>>(new Map());

  useEffect(() => {
    const element = container.current;
    if (!element) return;

    let map: MapLibreMap | undefined;
    let cancelled = false;

    void (async () => {
      const maplibregl = (await import("maplibre-gl")).default;
      if (cancelled) return;

      map = new maplibregl.Map({
        container: element,
        style: STYLE_URL,
        center: FALLBACK_CENTER,
        zoom: FALLBACK_ZOOM,
      });
      map.addControl(new maplibregl.NavigationControl(), "top-right");

      const bounds = new maplibregl.LngLatBounds();
      for (const row of rows) {
        if (row.lat == null || row.lng == null) continue;
        const lngLat: [number, number] = [row.lng, row.lat];
        const popup = new maplibregl.Popup({ offset: 16 }).setHTML(
          `<a href="${row.href}" class="font-medium text-rose-600 underline">${escapeHtml(row.name)}</a>` +
            (row.completedYear
              ? `<div class="mt-0.5 text-xs text-gray-500">${row.completedYear}年</div>`
              : ""),
        );
        const marker = new maplibregl.Marker({ color: markerColor(row) })
          .setLngLat(lngLat)
          .setPopup(popup)
          .addTo(map);
        const markerElement = marker.getElement();
        markerElement.style.cursor = "pointer";
        markerElement.addEventListener("mouseenter", () => onHover(row.href));
        markerElement.addEventListener("mouseleave", () => onHover(null));
        markers.current.set(row.href, marker);
        bounds.extend(lngLat);
      }
      if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 64, maxZoom: 12 });
    })();

    const current = markers.current;
    return () => {
      cancelled = true;
      map?.remove();
      current.clear();
    };
  }, [rows, onHover]);

  // Reflect the hovered key onto the markers.
  useEffect(() => {
    for (const [href, marker] of markers.current) {
      marker.getElement().classList.toggle("marker-active", href === hovered);
    }
  }, [hovered]);

  return <div ref={container} className="h-[60vh] w-full" />;
}
