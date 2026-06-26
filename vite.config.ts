import { defineConfig } from "vite-plus";

export default defineConfig({
  staged: {
    "*": [
      "vp check --fix",
      // gitleaks scans the staged set itself via --staged; use the function
      // form so lint-staged doesn't append filenames to the command.
      () => "gitleaks git --pre-commit --redact --staged",
    ],
    // Regenerate content/README.md from the collections, then re-stage it.
    // Function form: the script globs the collections itself, no filenames.
    "content/**/*.md": () => "vp run content && git add content/README.md",
    // Format the flake with nixfmt via treefmt. Function form: `nix fmt`
    // formats the tree itself; lint-staged re-stages the matched .nix files.
    "*.nix": () => "nix fmt",
  },
  run: {
    tasks: {
      // Regenerate content/README.md from the collections. Cached by default
      // (task), keyed on the collection sources + the script; README is the
      // archived output, restored on a cache hit. README is excluded from the
      // inputs because the script writes it (it's an output, not a source).
      content: {
        command: "bun run scripts/content-readme.ts",
        input: ["content/**/*.md", "!content/README.md", "scripts/content-readme.ts"],
        output: ["content/README.md"],
      },
    },
  },
  fmt: {
    sortImports: true,
    sortTailwindcss: true,
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
    jsPlugins: [
      {
        name: "vite-plus",
        specifier: "vite-plus/oxlint-plugin",
      },
    ],
    rules: {
      "vite-plus/prefer-vite-plus-imports": "error",
    },
  },
});
