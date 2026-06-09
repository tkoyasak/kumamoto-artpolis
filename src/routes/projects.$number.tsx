import { createFileRoute, Link } from "@tanstack/react-router";
import { projects } from "../data/projects.ts";

// File name projects.$number.tsx maps to "/projects/$number". The `number`
// param is the official Art Polis number used as the project key.
export const Route = createFileRoute("/projects/$number")({
  component: ProjectDetail,
});

// Placeholder detail page. The full photo-rich visit log lives here later.
function ProjectDetail() {
  const { number } = Route.useParams();
  const project = projects.find((candidate) => String(candidate.number) === number);

  return (
    <main className="mx-auto max-w-2xl p-8">
      <Link to="/" className="text-sm text-rose-600 hover:underline">
        ← 一覧へ戻る
      </Link>

      {project ? (
        <>
          <h1 className="mt-4 text-2xl font-bold">{project.name}</h1>
          <p className="mt-1 text-sm text-gray-600">
            {project.architects.join("、")} / {project.completedYear}年 / {project.municipality}
          </p>
          <p className="mt-6 text-gray-500">訪問記は準備中です。</p>
        </>
      ) : (
        <p className="mt-4 text-gray-500">プロジェクトが見つかりませんでした。</p>
      )}
    </main>
  );
}
