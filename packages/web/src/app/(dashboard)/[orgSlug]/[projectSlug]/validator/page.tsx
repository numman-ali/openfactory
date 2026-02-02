// SPDX-License-Identifier: AGPL-3.0
"use client";

import { use, useState } from "react";
import { Inbox, Filter, ExternalLink, Bug, Lightbulb, Gauge, MoreHorizontal, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useProjectContext } from "@/lib/hooks/useProjectContext";
import { useFeedback } from "@/lib/hooks/useFeedback";

interface FeedbackRow {
  id: string;
  title: string | null;
  description: string;
  category: string | null;
  priorityScore: number | null;
  status: string;
  tags: string[];
  externalUserId: string | null;
  createdAt: string;
  generatedIssueUrl: string | null;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  bug: <Bug className="h-3.5 w-3.5" />,
  feature_request: <Lightbulb className="h-3.5 w-3.5" />,
  performance: <Gauge className="h-3.5 w-3.5" />,
  other: <MoreHorizontal className="h-3.5 w-3.5" />,
};

const STATUS_STYLES: Record<string, string> = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  triaged: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  in_progress: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  resolved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  dismissed: "bg-muted text-muted-foreground",
};

export default function ValidatorPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = use(params);
  const { projectId } = useProjectContext(orgSlug, projectSlug);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const { feedbackItems, isLoading, totalCount } = useFeedback(
    projectId,
    statusFilter ? { status: statusFilter } : undefined
  );
  const [selectedItem, setSelectedItem] = useState<FeedbackRow | null>(null);
  const [search, setSearch] = useState("");

  const filtered = feedbackItems.filter((item) => {
    if (!search) return true;
    const text = (item.title ?? "") + " " + item.description;
    return text.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-border px-6 py-3">
          <div className="flex items-center gap-3">
            <Inbox className="h-5 w-5" />
            <h1 className="text-lg font-semibold">Validator</h1>
            <Badge variant="secondary">
              {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : `${totalCount} items`}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Filter className="mr-1 h-3.5 w-3.5" /> Filter
            </Button>
          </div>
        </div>

        <Tabs
          defaultValue="all"
          className="flex flex-1 flex-col"
          onValueChange={(val) => setStatusFilter(val === "all" ? undefined : val)}
        >
          <div className="border-b border-border px-6 pt-2">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="new">New</TabsTrigger>
              <TabsTrigger value="triaged">Triaged</TabsTrigger>
              <TabsTrigger value="in_progress">In Progress</TabsTrigger>
              <TabsTrigger value="resolved">Resolved</TabsTrigger>
            </TabsList>
          </div>

          <div className="px-6 pt-4">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search feedback..."
              className="max-w-sm"
            />
          </div>

          <TabsContent value="all" className="flex-1 overflow-auto px-6 py-4">
            {isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Inbox className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-sm text-muted-foreground">No feedback yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Feedback will appear here once users submit it via the API.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-lg border border-border p-4 text-left transition-colors hover:bg-accent/50",
                      selectedItem?.id === item.id && "border-primary bg-accent/50"
                    )}
                  >
                    <span className="mt-0.5 text-muted-foreground">
                      {CATEGORY_ICONS[item.category ?? "other"]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">
                          {item.title ?? item.description.slice(0, 60)}
                        </span>
                        <Badge variant="secondary" className={cn("shrink-0", STATUS_STYLES[item.status] ?? "")}>
                          {item.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                        {item.description}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        {item.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                        ))}
                        {item.priorityScore != null && (
                          <span className="text-xs text-muted-foreground">
                            Priority: {Math.round(item.priorityScore * 100)}%
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Filtered tabs render same content filtered by status hook */}
          {["new", "triaged", "in_progress", "resolved"].map((status) => (
            <TabsContent key={status} value={status} className="flex-1 overflow-auto px-6 py-4">
              {isLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Inbox className="h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-sm text-muted-foreground">
                    No {status.replace("_", " ")} feedback items
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filtered.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-lg border border-border p-4 text-left transition-colors hover:bg-accent/50",
                        selectedItem?.id === item.id && "border-primary bg-accent/50"
                      )}
                    >
                      <span className="mt-0.5 text-muted-foreground">
                        {CATEGORY_ICONS[item.category ?? "other"]}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">
                            {item.title ?? item.description.slice(0, 60)}
                          </span>
                          <Badge variant="secondary" className={cn("shrink-0", STATUS_STYLES[item.status] ?? "")}>
                            {item.status.replace("_", " ")}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                          {item.description}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {selectedItem && (
        <div className="w-96 border-l border-border overflow-auto">
          <div className="border-b border-border px-4 py-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold truncate">
                {selectedItem.title ?? "Feedback Detail"}
              </h2>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-xs text-muted-foreground hover:text-foreground"
                aria-label="Close detail panel"
              >
                Close
              </button>
            </div>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
              <p className="text-sm">{selectedItem.description}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Category</p>
              <Badge variant="outline">{selectedItem.category ?? "Uncategorized"}</Badge>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Status</p>
              <Badge variant="secondary" className={STATUS_STYLES[selectedItem.status] ?? ""}>
                {selectedItem.status.replace("_", " ")}
              </Badge>
            </div>
            {selectedItem.generatedIssueUrl && (
              <div>
                <a
                  href={selectedItem.generatedIssueUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View Issue
                </a>
              </div>
            )}
            <div className="pt-2">
              <Button size="sm" className="w-full">
                Generate Issue
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
