import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

// https://astro.build/config
// Static output (SSG): every page is prerendered at build time.
export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },
});
