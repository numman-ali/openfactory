// SPDX-License-Identifier: AGPL-3.0

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { projectSlug } = await params;
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">{projectSlug}</h1>
      <p className="mt-2 text-muted-foreground">
        Project overview and module stats will appear here.
      </p>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Requirements", count: 0, module: "refinery" },
          { label: "Blueprints", count: 0, module: "foundry" },
          { label: "Work Orders", count: 0, module: "planner" },
          { label: "Feedback", count: 0, module: "validator" },
        ].map((stat) => (
          <div
            key={stat.module}
            className="rounded-lg border border-border p-4"
          >
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="mt-1 text-2xl font-semibold">{stat.count}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
