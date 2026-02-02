// SPDX-License-Identifier: AGPL-3.0
"use client";

import { useState } from "react";
import { Plus, Filter, Link2, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/data-table/data-table";
import { AgentChatPanel, type ChatMessage } from "@/components/chat/agent-chat-panel";

interface WorkOrder {
  id: string;
  title: string;
  status: "backlog" | "ready" | "in_progress" | "in_review" | "done";
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

const columns: Column<WorkOrder>[] = [
  {
    id: "title",
    header: "Title",
    accessorFn: (row) => row.title,
    sortable: true,
  },
  {
    id: "status",
    header: "Status",
    accessorFn: (row) => (
      <Badge variant="secondary" className={STATUS_COLORS[row.status]}>
        {STATUS_LABELS[row.status]}
      </Badge>
    ),
    sortable: true,
    width: "120px",
  },
  {
    id: "phase",
    header: "Phase",
    accessorFn: (row) => row.phase ?? "Unassigned",
    sortable: true,
    width: "140px",
  },
  {
    id: "feature",
    header: "Feature",
    accessorFn: (row) => row.feature ?? "-",
    width: "160px",
  },
  {
    id: "assignees",
    header: "Assignees",
    accessorFn: (row) => row.assignees.length > 0 ? row.assignees.join(", ") : "Unassigned",
    width: "140px",
  },
];

export default function PlannerPage() {
  const [workOrders] = useState<WorkOrder[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [showChat, setShowChat] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);

  const handleSendMessage = (content: string) => {
    const msg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
    };
    setChatMessages((prev) => [...prev, msg]);
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Main Table Area */}
      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-border px-6 py-3">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold">Planner</h1>
            <Badge variant="secondary">{workOrders.length} work orders</Badge>
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
          <DataTable
            columns={columns}
            data={workOrders}
            getRowId={(row) => row.id}
            searchPlaceholder="Search work orders..."
            searchAccessor={(row) => row.title}
            onRowClick={(row) => setSelectedWorkOrder(row)}
            emptyMessage="No work orders yet. Create one or extract from blueprints."
          />
        </div>
      </div>

      {/* Work Order Detail Panel */}
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
              <Badge variant="secondary" className={STATUS_COLORS[selectedWorkOrder.status]}>
                {STATUS_LABELS[selectedWorkOrder.status]}
              </Badge>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
              <p className="text-sm text-muted-foreground">TipTap editor for rich description will render here.</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Implementation Plan</p>
              <p className="text-sm text-muted-foreground">Step-by-step implementation plan will render here.</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Knowledge Graph</p>
              <p className="text-sm text-muted-foreground">Connected documents and blueprints will show here.</p>
            </div>
          </div>
        </div>
      )}

      {/* Agent Chat Panel */}
      {showChat && (
        <AgentChatPanel
          title="Planner Agent"
          messages={chatMessages}
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
