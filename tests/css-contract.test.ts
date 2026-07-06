import { readFileSync } from "node:fs";

import { expect, test } from "vitest";

import { MARKER_COLORS } from "../src/lib/map.ts";

const css = readFileSync(new URL("../src/styles/global.css", import.meta.url), "utf8");

test("global.css theme colors match the marker colors the map script hardcodes — neither build nor TS checks this", () => {
  expect(css).toContain(`--color-project: ${MARKER_COLORS.project}`);
  expect(css).toContain(`--color-kap92: ${MARKER_COLORS.kap92}`);
});

test("the .marker-active class the map script toggles exists in global.css", () => {
  expect(css).toContain(".marker-active");
});
