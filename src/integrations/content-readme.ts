import fs from "node:fs";
import path from "node:path";
import type { AstroIntegration, AstroIntegrationLogger } from "astro";
import { parse as parseYaml } from "yaml";

const CONTENT_DIR = "content";
const README = path.join(CONTENT_DIR, "README.md");

// One parsed Markdown file: `id` is the filename without `.md` (the entry id /
// URL key), `data` is its YAML frontmatter.
type Entry = { id: string; data: Record<string, unknown> };
type Column = { header: string; align?: "right"; value: (e: Entry) => string };

// content/README.md is fully generated from the collections below: each gets a
// short description, an optional reference link, and an index table.
const COLLECTIONS: {
  name: string;
  description: string;
  ref?: string;
  columns: Column[];
  sort: (a: Entry, b: Entry) => number;
}[] = [
  {
    name: "projects",
    description: "Art Polis commissioned new builds.",
    ref: "https://www.pref.kumamoto.jp/soshiki/115/83273.html",
    columns: numberSlugColumns(),
    sort: byNumber,
  },
  {
    name: "kap92",
    description: "KAP'92 selected existing buildings.",
    ref: "https://www.pref.kumamoto.jp/soshiki/115/4477.html",
    columns: numberSlugColumns(),
    sort: byNumber,
  },
  {
    name: "status",
    description: "Daily visit records, one file per date.",
    columns: [
      { header: "date", value: (e) => e.id },
      {
        header: "projects",
        value: (e) =>
          ((e.data.projects as string[] | undefined) ?? []).map((slug) => `\`${slug}\``).join(", "),
      },
    ],
    sort: (a, b) => a.id.localeCompare(b.id),
  },
];

// projects and kap92 share the same number/slug/name shape.
function numberSlugColumns(): Column[] {
  return [
    { header: "number", align: "right", value: (e) => String(e.data.number) },
    { header: "slug", value: (e) => `\`${e.data.slug}\`` },
    { header: "name", value: (e) => String(e.data.name ?? "") },
  ];
}

function byNumber(a: Entry, b: Entry): number {
  return Number(a.data.number) - Number(b.data.number);
}

// Read and parse every `*.md` in content/<collection>.
function readEntries(collection: string): Entry[] {
  const dir = path.join(CONTENT_DIR, collection);
  const entries: Entry[] = [];
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".md")) continue;
    const raw = fs.readFileSync(path.join(dir, file), "utf8");
    const match = raw.match(/^---\n([\s\S]*?)\n---/);
    const data = match?.[1] ? (parseYaml(match[1]) ?? {}) : {};
    entries.push({ id: file.replace(/\.md$/, ""), data });
  }
  return entries;
}

// Render a GitHub Markdown table. Columns aren't padded here; the pre-commit
// treefmt/oxfmt hook owns the final alignment.
function renderTable(columns: Column[], entries: Entry[]): string {
  const join = (cells: string[]) => `| ${cells.join(" | ")} |`;
  return [
    join(columns.map((c) => c.header)),
    join(columns.map((c) => (c.align === "right" ? "---:" : "---"))),
    ...entries.map((e) => join(columns.map((c) => c.value(e)))),
  ].join("\n");
}

// Render the whole README from scratch.
function renderReadme(): string {
  const sections = COLLECTIONS.map((c) => {
    const parts = [`## \`${c.name}/\``, "", c.description];
    if (c.ref) parts.push("", `Reference: <${c.ref}>`);
    const entries = readEntries(c.name).sort(c.sort);
    if (entries.length > 0) parts.push("", renderTable(c.columns, entries));
    return parts.join("\n");
  });
  return [
    "# content",
    "",
    "<!-- AUTO-GENERATED at build time. Do not edit by hand. -->",
    "",
    sections.join("\n\n"),
    "",
  ].join("\n");
}

// Write the unformatted README; the pre-commit treefmt/oxfmt hook owns the
// final layout (table alignment etc.). Skip the write when nothing changed.
function updateReadme(logger: AstroIntegrationLogger): void {
  const next = renderReadme();
  const current = fs.existsSync(README) ? fs.readFileSync(README, "utf8") : "";

  if (next === current) {
    logger.info(`${README} already up to date`);
    return;
  }
  fs.writeFileSync(README, next);
  logger.info(`Regenerated ${README}`);
}

export default function contentReadme(): AstroIntegration {
  return {
    name: "content-readme",
    hooks: {
      // Runs only on `astro build`, after pages are written.
      "astro:build:done": ({ logger }) => updateReadme(logger),
    },
  };
}
