// SPDX-License-Identifier: AGPL-3.0
import { Sidebar } from "@/components/layout/sidebar";

export default async function ProjectLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}>) {
  const { orgSlug, projectSlug } = await params;
  return (
    <div className="flex flex-1">
      <Sidebar orgSlug={orgSlug} projectSlug={projectSlug} />
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
