import fs from "node:fs";
import path from "node:path";
import type { AstroIntegration, AstroIntegrationLogger } from "astro";
import { parse as parseYaml } from "yaml";

// content/README.md is fully generated from the collections below. Each entry
// gets a short description, an optional reference link, and (when the files
// carry number/slug frontmatter) the number->slug table.
const COLLECTIONS = [
  {
    name: "projects",
    description: "Art Polis commissioned new builds.",
    ref: "https://www.pref.kumamoto.jp/soshiki/115/83273.html",
  },
  {
    name: "kap92",
    description: "KAP'92 selected existing buildings.",
    ref: "https://www.pref.kumamoto.jp/soshiki/115/4477.html",
  },
  {
    name: "status",
    description: "Daily visit records, one file per date.",
  },
] as const;

const CONTENT_DIR = "content";
const README = path.join(CONTENT_DIR, "README.md");

type Row = { number: number; slug: string; name: string };

// Read every `*.md` in content/<collection>, parse its YAML frontmatter, and
// return the number/slug/name rows sorted by number.
function collectRows(collection: string): Row[] {
  const dir = path.join(CONTENT_DIR, collection);
  const rows: Row[] = [];
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".md")) continue;
    const raw = fs.readFileSync(path.join(dir, file), "utf8");
    const match = raw.match(/^---\n([\s\S]*?)\n---/);
    if (!match?.[1]) continue;
    const data = parseYaml(match[1]) as Partial<Row>;
    if (typeof data.number !== "number" || !data.slug) continue;
    rows.push({ number: data.number, slug: data.slug, name: data.name ?? "" });
  }
  return rows.sort((a, b) => a.number - b.number);
}

function renderTable(rows: Row[]): string {
  const lines = ["| number | slug | name |", "| ---: | --- | --- |"];
  for (const r of rows) lines.push(`| ${r.number} | \`${r.slug}\` | ${r.name} |`);
  return lines.join("\n");
}

// Render the whole README from scratch.
function renderReadme(): string {
  const sections = COLLECTIONS.map((c) => {
    const parts = [`## \`${c.name}/\``, "", c.description];
    if ("ref" in c) parts.push("", `Reference: <${c.ref}>`);
    const rows = collectRows(c.name);
    if (rows.length > 0) parts.push("", renderTable(rows));
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
