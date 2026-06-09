import { createFileRoute } from "@tanstack/react-router";

// File name index.tsx maps to path "/". The plugin type-checks the createFileRoute argument.
export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-3xl font-bold">Kumamoto Art Polis</h1>
      <p className="mt-2 text-gray-600">TanStack Start + Cloudflare Workers で動いています。</p>
    </main>
  );
}
