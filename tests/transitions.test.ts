/// <reference types="bun-types" />

import { expect, test } from "bun:test";

import { rowTransitionName } from "../src/lib/transitions.ts";

test("a row's transition name is a CSS-safe ident: hrefs contain slashes, which view-transition-name forbids", () => {
  const name = rowTransitionName("/projects/foo-bar");
  expect(name).toBe("row-projects-foo-bar");
  expect(name).toMatch(/^[a-zA-Z][a-zA-Z0-9-]*$/);
});

test("same-id rows in different collections get distinct transition names, so a morph can't pair the wrong rows", () => {
  expect(rowTransitionName("/projects/foo")).not.toBe(rowTransitionName("/kap92/foo"));
});
