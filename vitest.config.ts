/// <reference types="vitest/config" />

import { getViteConfig } from "astro/config";

export default getViteConfig({
  test: {
    // In-source tests (import.meta.vitest) live inside the modules they pin.
    includeSource: ["src/**/*.ts"],
  },
});
