// SPDX-License-Identifier: AGPL-3.0

export default async function OrgDashboardPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Projects</h1>
      <p className="mt-2 text-muted-foreground">
        Select a project to get started in {orgSlug}.
      </p>
    </div>
  );
}
