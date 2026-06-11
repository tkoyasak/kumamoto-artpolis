import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

// https://astro.build/config
// Static output (SSG): every page is prerendered at build time.
// React is used only for interactive islands (e.g. the home map+table explorer).
export default defineConfig({
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
});
