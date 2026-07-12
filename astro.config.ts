import preact from "@astrojs/preact";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

// https://astro.build/config
// Static output (SSG): every page is prerendered at build time.
// Preact (with compat) powers interactive islands; compat lets React libraries
// like @tanstack/react-table run on Preact's smaller runtime.
export default defineConfig({
  integrations: [preact({ compat: true })],
  vite: {
    plugins: [tailwindcss()],
    // Strip the in-source vitest blocks from production bundles.
    define: { "import.meta.vitest": "undefined" },
    build: {
      rolldownOptions: {
        output: {
          // Split maplibre (~1 MB) into its own cacheable chunk (deliberately not
          // head-preloaded), dynamically imported by the map island only when the
          // map first shows. See docs/issues/0001.
          manualChunks(id: string) {
            return id.includes("maplibre-gl") ? "maplibre-gl" : undefined;
          },
        },
      },
    },
  },
});
