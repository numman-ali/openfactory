// SPDX-License-Identifier: AGPL-3.0
"use client";

import { use } from "react";
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
import { cn } from "@/lib/utils";

interface ModuleStat {
  label: string;
  count: number;
  icon: React.ReactNode;
  href: string;
  trend: string;
  description: string;
}

interface ActivityItem {
  id: string;
  action: string;
  module: string;
  timestamp: string;
  actor: string;
}

const PLACEHOLDER_ACTIVITY: ActivityItem[] = [
  {
    id: "1",
    action: "Created feature requirement: User Authentication",
    module: "refinery",
    timestamp: "2 hours ago",
    actor: "System",
  },
  {
    id: "2",
    action: "Generated system diagram: Auth Flow",
    module: "foundry",
    timestamp: "3 hours ago",
    actor: "Foundry Agent",
  },
  {
    id: "3",
    action: "Work order moved to In Progress: Setup CI/CD",
    module: "planner",
    timestamp: "5 hours ago",
    actor: "System",
  },
];

const MODULE_COLORS: Record<string, string> = {
  refinery: "text-blue-600 dark:text-blue-400",
  foundry: "text-purple-600 dark:text-purple-400",
  planner: "text-yellow-600 dark:text-yellow-400",
  validator: "text-green-600 dark:text-green-400",
};

export default function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = use(params);

  const stats: ModuleStat[] = [
    {
      label: "Requirements",
      count: 0,
      icon: <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
      href: `/${orgSlug}/${projectSlug}/refinery`,
      trend: "+0 this week",
      description: "Documents in Refinery",
    },
    {
      label: "Blueprints",
      count: 0,
      icon: <FileCode className="h-5 w-5 text-purple-600 dark:text-purple-400" />,
      href: `/${orgSlug}/${projectSlug}/foundry`,
      trend: "+0 this week",
      description: "Blueprints in Foundry",
    },
    {
      label: "Work Orders",
      count: 0,
      icon: <ListChecks className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />,
      href: `/${orgSlug}/${projectSlug}/planner`,
      trend: "0 in progress",
      description: "Tasks in Planner",
    },
    {
      label: "Feedback",
      count: 0,
      icon: <Inbox className="h-5 w-5 text-green-600 dark:text-green-400" />,
      href: `/${orgSlug}/${projectSlug}/validator`,
      trend: "0 unresolved",
      description: "Items in Validator",
    },
  ];

  return (
    <div className="flex-1 overflow-auto">
      <div className="border-b border-border px-6 py-4">
        <h1 className="text-2xl font-bold">{projectSlug}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Project overview and module health
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Module Stats */}
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
                    {stat.trend}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Recent Activity */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">Recent Activity</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {PLACEHOLDER_ACTIVITY.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No activity yet. Start by creating requirements in the Refinery.
                </p>
              ) : (
                <div className="space-y-3">
                  {PLACEHOLDER_ACTIVITY.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 rounded-lg border border-border p-3"
                    >
                      <div
                        className={cn(
                          "mt-0.5 rounded-full bg-muted p-1.5",
                          MODULE_COLORS[item.module]
                        )}
                      >
                        <Activity className="h-3 w-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{item.action}</p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{item.actor}</span>
                          <span>-</span>
                          <span>{item.timestamp}</span>
                        </div>
                      </div>
                      <Badge variant="outline" className="shrink-0 text-xs">
                        {item.module}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions & Knowledge Graph Summary */}
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
                    <span className="font-medium">0</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Connections</span>
                    <span className="font-medium">0</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Coverage</span>
                    <Badge variant="secondary" className="text-xs">N/A</Badge>
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
                  No team members yet. Invite collaborators from organization settings.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
