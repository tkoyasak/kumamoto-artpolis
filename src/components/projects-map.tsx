import type { Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useRef } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { isVisited, type Project } from "../data/projects.ts";

// CARTO positron basemap. No API key required.
const STYLE_URL = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
// Fallback view when there are no projects to fit (Kumamoto City).
const FALLBACK_CENTER: [number, number] = [130.7417, 32.7898];
const FALLBACK_ZOOM = 8;

const VISITED_COLOR = "#e11d48"; // rose-600
const UNVISITED_COLOR = "#9ca3af"; // gray-400

// Escape user-facing strings before injecting them into popup HTML.
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

// Client-only map: maplibre-gl touches the DOM, so it is dynamically imported
// inside the effect and never runs during SSR. The server renders the empty
// container, and the map mounts after hydration.
export function ProjectsMap({ projects }: { projects: Project[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let map: MapLibreMap | undefined;
    let cancelled = false;

    void (async () => {
      const maplibregl = (await import("maplibre-gl")).default;
      if (cancelled) return;

      map = new maplibregl.Map({
        container,
        style: STYLE_URL,
        center: FALLBACK_CENTER,
        zoom: FALLBACK_ZOOM,
      });
      map.addControl(new maplibregl.NavigationControl(), "top-right");

      const bounds = new maplibregl.LngLatBounds();
      for (const project of projects) {
        const lngLat: [number, number] = [project.lng, project.lat];
        const popup = new maplibregl.Popup({ offset: 16 }).setHTML(
          `<a href="/projects/${project.number}" class="font-medium text-rose-600 underline">${escapeHtml(project.name)}</a>` +
            `<div class="mt-0.5 text-xs text-gray-500">${project.completedYear}年</div>`,
        );
        new maplibregl.Marker({ color: isVisited(project) ? VISITED_COLOR : UNVISITED_COLOR })
          .setLngLat(lngLat)
          .setPopup(popup)
          .addTo(map);
        bounds.extend(lngLat);
      }

      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 64, maxZoom: 12 });
      }
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [projects]);

  return <div ref={containerRef} className="h-[60vh] w-full" />;
}
