/// <reference types="bun-types" />

import { mock } from "bun:test";

import { z } from "astro/zod";

// The one astro:content mock shared by every test file. Bun's module registry
// is shared across test files and an ESM namespace can't grow new exports on
// re-mock, so per-file mocks with different shapes clobber each other — all
// consumers share this canonical shape and swap `content` state instead.

export type MockRef = { collection: "projects" | "kap92"; id: string };

export const refKey = (ref: MockRef): string => `${ref.collection}/${ref.id}`;

export const content = {
  projects: [] as unknown[],
  kap92: [] as unknown[],
  status: [] as unknown[],
  entries: new Map<string, unknown>(),
};

export function resetContent(): void {
  content.projects = [];
  content.kap92 = [];
  content.status = [];
  content.entries = new Map();
}

mock.module("astro:content", () => ({
  getCollection: async (name: "projects" | "kap92" | "status") => content[name],
  getEntry: async (ref: MockRef) => content.entries.get(refKey(ref)),
  // reference() is a plain string schema: only its presence matters to the
  // XOR refine under test.
  defineCollection: (config: unknown) => config,
  reference: () => z.string(),
}));

mock.module("astro/loaders", () => ({
  glob: () => ({}),
}));
