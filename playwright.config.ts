import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: "http://localhost:4321",
    // System Chrome — the toolchain installs no browser binaries
    // (`playwright install` is never run).
    channel: "chrome",
    trace: "on-first-retry",
  },
  webServer: {
    // Test the production build: `astro preview` serves dist/ the same way
    // Workers static assets do (modulo not_found_handling).
    command: "bun run build && bun run preview",
    url: "http://localhost:4321",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
