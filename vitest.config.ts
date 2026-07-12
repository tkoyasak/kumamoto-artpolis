/// <reference types="vitest/config" />

import { getViteConfig } from "astro/config";
import { configDefaults } from "vitest/config";

export default getViteConfig({
  test: {
    // In-source tests (import.meta.vitest) live inside the modules they pin.
    includeSource: ["src/**/*.ts"],
    // .direnv/flake-inputs contains a Nix store snapshot of this repo itself;
    // without this, Vitest crawls it and runs every test file twice.
    // e2e/ holds Playwright tests, run by Playwright (`bun run e2e`).
    // .claude/worktrees holds agents' repo copies, whose e2e/ the root
    // exclude above doesn't cover.
    exclude: [...configDefaults.exclude, "**/.direnv/**", "e2e/**", "**/.claude/**"],
  },
});
