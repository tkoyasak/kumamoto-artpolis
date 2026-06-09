import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ProjectsMap } from "../components/projects-map.tsx";
import { latestVisitedDate, projects } from "../data/projects.ts";

// File name index.tsx maps to path "/". The plugin type-checks the createFileRoute argument.
export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const navigate = useNavigate();

  return (
    <main>
      <ProjectsMap projects={projects} />

      <section className="mx-auto max-w-5xl p-4 sm:p-8">
        <h1 className="text-2xl font-bold">熊本アートポリス 訪問記録</h1>
        <p className="mt-1 text-sm text-gray-600">参加プロジェクト {projects.length} 件</p>

        <table className="mt-6 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-300 text-left text-gray-500">
              <th className="py-2 pr-4 font-medium">No.</th>
              <th className="py-2 pr-4 font-medium">名称</th>
              <th className="py-2 pr-4 font-medium">設計者</th>
              <th className="py-2 pr-4 font-medium">用途</th>
              <th className="py-2 pr-4 font-medium">所在地</th>
              <th className="py-2 pr-4 font-medium">竣工</th>
              <th className="py-2 font-medium">訪問日</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => {
              const params = { number: String(project.number) };
              return (
                <tr
                  key={project.number}
                  onClick={() => void navigate({ to: "/projects/$number", params })}
                  className="cursor-pointer border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="py-2 pr-4 tabular-nums text-gray-500">{project.number}</td>
                  <td className="py-2 pr-4 font-medium">
                    <Link
                      to="/projects/$number"
                      params={params}
                      className="hover:underline"
                      // Avoid double navigation from the row's onClick.
                      onClick={(event) => event.stopPropagation()}
                    >
                      {project.name}
                    </Link>
                  </td>
                  <td className="py-2 pr-4">{project.architects.join("、")}</td>
                  <td className="py-2 pr-4">{project.use}</td>
                  <td className="py-2 pr-4">{project.municipality}</td>
                  <td className="py-2 pr-4 tabular-nums">{project.completedYear}</td>
                  <td className="py-2 tabular-nums text-gray-500">
                    {latestVisitedDate(project) ?? ""}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </main>
  );
}
