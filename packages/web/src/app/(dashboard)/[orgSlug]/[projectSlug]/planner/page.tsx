// SPDX-License-Identifier: AGPL-3.0
"use client";

import { use, useState } from "react";
import { Plus, Filter, Link2, SlidersHorizontal, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type ColumnDef } from "@/components/data-table/data-table";
import { AgentChatPanel } from "@/components/chat/agent-chat-panel";
import { RichEditor } from "@/components/editor";
import { useProjectContext } from "@/lib/hooks/useProjectContext";
import { useWorkOrders } from "@/lib/hooks/useWorkOrders";
import { useAgentChat } from "@/lib/hooks/useAgentChat";

interface WorkOrderRow {
  id: string;
  title: string;
  status: string;
  phase: string | null;
  feature: string | null;
  assignees: string[];
  deliverableType: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  backlog: "bg-muted text-muted-foreground",
  ready: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  in_progress: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  in_review: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  done: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

const STATUS_LABELS: Record<string, string> = {
  backlog: "Backlog",
  ready: "Ready",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
};

const columns: ColumnDef<WorkOrderRow, unknown>[] = [
  {
    accessorKey: "title",
    header: "Title",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant="secondary" className={STATUS_COLORS[row.original.status] ?? ""}>
        {STATUS_LABELS[row.original.status] ?? row.original.status}
      </Badge>
    ),
  },
  {
    accessorKey: "phase",
    header: "Phase",
    cell: ({ row }) => row.original.phase ?? "Unassigned",
  },
  {
    accessorKey: "feature",
    header: "Feature",
    cell: ({ row }) => row.original.feature ?? "-",
    enableSorting: false,
  },
  {
    accessorKey: "assignees",
    header: "Assignees",
    cell: ({ row }) =>
      row.original.assignees.length > 0
        ? row.original.assignees.join(", ")
        : "Unassigned",
    enableSorting: false,
  },
];

export default function PlannerPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = use(params);
  const { projectId } = useProjectContext(orgSlug, projectSlug);
  const { workOrders, isLoading, totalCount } = useWorkOrders(projectId);
  const { messages: chatMessages, isLoading: chatLoading, sendMessage } = useAgentChat(projectId);
  const [showChat, setShowChat] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrderRow | null>(null);

  const tableData: WorkOrderRow[] = workOrders.map((wo) => ({
    id: wo.id,
    title: wo.title,
    status: wo.status,
    phase: wo.phase?.name ?? null,
    feature: wo.feature?.name ?? null,
    assignees: wo.assignees.map((a) => a.name),
    deliverableType: wo.deliverableType,
  }));

  const handleSendMessage = (content: string) => {
    sendMessage(content, "planner");
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-border px-6 py-3">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold">Planner</h1>
            <Badge variant="secondary">
              {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : `${totalCount} work orders`}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Link2 className="mr-1 h-3.5 w-3.5" /> MCP Setup
            </Button>
            <Button variant="outline" size="sm">
              <Filter className="mr-1 h-3.5 w-3.5" /> Filter
            </Button>
            <Button variant="outline" size="sm">
              <SlidersHorizontal className="mr-1 h-3.5 w-3.5" /> Group by Phase
            </Button>
            <Button size="sm">
              <Plus className="mr-1 h-3.5 w-3.5" /> New Work Order
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowChat(!showChat)}>
              Agent
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={tableData}
              getRowId={(row: WorkOrderRow) => row.id}
              searchPlaceholder="Search work orders..."
              searchColumn="title"
            />
          )}
        </div>
      </div>

      {selectedWorkOrder && (
        <div className="w-96 border-l border-border overflow-auto">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold truncate">{selectedWorkOrder.title}</h2>
            <button
              onClick={() => setSelectedWorkOrder(null)}
              className="text-muted-foreground hover:text-foreground text-xs"
              aria-label="Close detail panel"
            >
              Close
            </button>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Status</p>
              <Badge variant="secondary" className={STATUS_COLORS[selectedWorkOrder.status] ?? ""}>
                {STATUS_LABELS[selectedWorkOrder.status] ?? selectedWorkOrder.status}
              </Badge>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
              <RichEditor
                placeholder="Add a description..."
                showToolbar={false}
                showBubbleMenu
                className="text-sm"
              />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Implementation Plan</p>
              <RichEditor
                placeholder="Add implementation steps..."
                showToolbar={false}
                showBubbleMenu
                className="text-sm"
              />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Knowledge Graph</p>
              <p className="text-sm text-muted-foreground">Connected documents and blueprints will show here.</p>
            </div>
          </div>
        </div>
      )}

      {showChat && (
        <AgentChatPanel
          title="Planner Agent"
          messages={chatMessages}
          isLoading={chatLoading}
          onSendMessage={handleSendMessage}
          className="w-80"
          actions={[
            { id: "extract", label: "Extract Work Orders", description: "Generate work orders from blueprints" },
            { id: "phase", label: "Phase Planning", description: "Organize work into phases" },
            { id: "plan", label: "Update Implementation Plan", description: "Refine implementation guidance" },
          ]}
        />
      )}
    </div>
  );
}
