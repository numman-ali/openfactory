// SPDX-License-Identifier: AGPL-3.0
"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import {
  FileText,
  FileCode,
  ListChecks,
  Inbox,
  ArrowRight,
  Activity,
  GitBranch,
  Users,
  TrendingUp,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useOrganizations } from "@/lib/hooks/useOrganizations";
import { useProjects } from "@/lib/hooks/useProjects";
import { useProject } from "@/lib/hooks/useProjects";
import { useGraphNodes } from "@/lib/hooks/useGraph";
import { useGraphEdges } from "@/lib/hooks/useGraph";

export default function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = use(params);
  const { organizations } = useOrganizations();
  const org = useMemo(
    () => organizations.find((o) => o.slug === orgSlug),
    [organizations, orgSlug]
  );
  const { projects } = useProjects(org?.id);
  const proj = useMemo(
    () => projects.find((p) => p.slug === projectSlug),
    [projects, projectSlug]
  );
  const { project, isLoading } = useProject(proj?.id);
  const { nodes } = useGraphNodes(proj?.id);
  const { edges } = useGraphEdges(proj?.id);

  const stats = useMemo(
    () => [
      {
        label: "Requirements",
        count: project?.stats.documentCount ?? 0,
        icon: <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
        href: `/${orgSlug}/${projectSlug}/refinery`,
        description: "Documents in Refinery",
      },
      {
        label: "Blueprints",
        count: project?.stats.artifactCount ?? 0,
        icon: <FileCode className="h-5 w-5 text-purple-600 dark:text-purple-400" />,
        href: `/${orgSlug}/${projectSlug}/foundry`,
        description: "Blueprints in Foundry",
      },
      {
        label: "Work Orders",
        count: project?.stats.workOrderCount ?? 0,
        icon: <ListChecks className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />,
        href: `/${orgSlug}/${projectSlug}/planner`,
        description: "Tasks in Planner",
      },
      {
        label: "Features",
        count: project?.stats.featureCount ?? 0,
        icon: <Inbox className="h-5 w-5 text-green-600 dark:text-green-400" />,
        href: `/${orgSlug}/${projectSlug}/validator`,
        description: "Features tracked",
      },
    ],
    [project, orgSlug, projectSlug]
  );

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="border-b border-border px-6 py-4">
        <h1 className="text-2xl font-bold">{project?.name ?? projectSlug}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {project?.description ?? "Project overview and module health"}
        </p>
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Link key={stat.label} href={stat.href}>
              <Card className="transition-colors hover:border-primary/50">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardDescription className="text-sm font-medium">
                    {stat.label}
                  </CardDescription>
                  {stat.icon}
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stat.count}</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Recent Activity</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground py-4 text-center">
                Activity feed will populate as you work on this project.
              </p>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">Quick Actions</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href={`/${orgSlug}/${projectSlug}/refinery`}>
                  <Button variant="outline" size="sm" className="w-full justify-between">
                    <span>Add Requirements</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
                <Link href={`/${orgSlug}/${projectSlug}/foundry`}>
                  <Button variant="outline" size="sm" className="w-full justify-between">
                    <span>Create Blueprint</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
                <Link href={`/${orgSlug}/${projectSlug}/planner`}>
                  <Button variant="outline" size="sm" className="w-full justify-between">
                    <span>New Work Order</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">Knowledge Graph</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Linked Nodes</span>
                    <span className="font-medium">{nodes.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Connections</span>
                    <span className="font-medium">{edges.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Coverage</span>
                    <Badge variant="secondary" className="text-xs">
                      {nodes.length > 0 ? "Active" : "N/A"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">Team</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Invite collaborators from organization settings.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
