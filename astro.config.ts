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
  },
});
