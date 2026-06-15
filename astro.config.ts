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
    build: {
      rollupOptions: {
        output: {
          // Split maplibre (~1 MB) into its own cacheable chunk, loaded at natural
          // priority (deliberately not head-preloaded). See issues/maplibre-chunk-loading.md.
          manualChunks(id: string) {
            return id.includes("maplibre-gl") ? "maplibre" : undefined;
          },
        },
      },
    },
  },
});
