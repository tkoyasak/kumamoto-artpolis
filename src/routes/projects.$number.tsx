import { createFileRoute, Link } from "@tanstack/react-router";
import { projects } from "../data/projects.ts";

// File name projects.$number.tsx maps to "/projects/$number". The `number`
// param is the official Art Polis number used as the project key.
export const Route = createFileRoute("/projects/$number")({
  component: ProjectDetail,
});

// Project detail page: building info plus a list of visit records. Each record
// will later link to its own Twitter-style /status/$slug page.
function ProjectDetail() {
  const { number } = Route.useParams();
  const project = projects.find((candidate) => String(candidate.number) === number);

  if (!project) {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <Link to="/" className="text-sm text-rose-600 hover:underline">
          ← 一覧へ戻る
        </Link>
        <p className="mt-4 text-gray-500">プロジェクトが見つかりませんでした。</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <Link to="/" className="text-sm text-rose-600 hover:underline">
        ← 一覧へ戻る
      </Link>

      <h1 className="mt-4 text-2xl font-bold">{project.name}</h1>
      <p className="mt-1 text-sm text-gray-600">
        {project.architects.join("、")} / {project.completedYear}年 / {project.municipality} /{" "}
        {project.use}
      </p>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">訪問記録</h2>
        {project.visitedDates.length > 0 ? (
          // TODO: link each date to its /status/$slug page once visit records exist.
          <ul className="mt-2 space-y-1 text-sm text-gray-700">
            {[...project.visitedDates]
              .sort((a, b) => b.localeCompare(a))
              .map((date) => (
                <li key={date}>{date}</li>
              ))}
          </ul>
        ) : (
          <p className="mt-2 text-gray-500">まだ訪問記録がありません。</p>
        )}
      </section>
    </main>
  );
}
