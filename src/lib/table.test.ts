/// <reference types="bun-types" />

import { expect, test } from "bun:test";

import { ENTRY_COL_WIDTHS, ENTRY_TABLE_WIDTH, outlineClass, tableWidth } from "./table.ts";

test("tableWidth sums the fixed columns into a definite rem width: table-layout fixed only truncates under a definite width", () => {
  expect(tableWidth(["4rem", "20rem"])).toBe("24rem");
  expect(ENTRY_TABLE_WIDTH).toBe(tableWidth(ENTRY_COL_WIDTHS));
});

test("the row outline follows the collection, mirroring the map marker colors", () => {
  expect(outlineClass("project")).toBe("outline-project");
  expect(outlineClass("kap92")).toBe("outline-kap92");
});
