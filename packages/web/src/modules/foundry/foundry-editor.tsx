// SPDX-License-Identifier: AGPL-3.0
"use client";

import * as React from "react";
import { useState } from "react";
import {
  FileCode,
  Download,
  ChevronDown,
  PanelRightOpen,
  PanelRightClose,
  AlertTriangle,
  Pencil,
  Search as SearchIcon,
  GitCompareArrows,
  Workflow,
  History,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RichEditor } from "@/components/editor";
import { ChatPanel } from "@/components/agent";
import {
  BlueprintTree,
  type BlueprintTreeItem,
} from "./blueprint-tree";
import { cn } from "@/lib/utils";

type BlueprintType =
  | "foundation_blueprint"
  | "system_diagram"
  | "feature_blueprint";

const TYPE_LABELS: Record<BlueprintType, string> = {
  foundation_blueprint: "Foundation",
  system_diagram: "System Diagram",
  feature_blueprint: "Feature Blueprint",
};

interface DriftAlert {
  id: string;
  driftType: string;
  description: string;
  severity: "low" | "medium" | "high";
  status: string;
}

interface VersionInfo {
  id: string;
  versionNumber: number;
  changeSummary: string | null;
  createdAt: string;
}

const FOUNDRY_AGENT_ACTIONS = [
  {
    id: "draft",
    label: "Draft Blueprint",
    description: "Generate blueprint content from requirements",
    icon: <Pencil className="h-4 w-4" />,
  },
  {
    id: "review",
    label: "Review for Gaps",
    description: "Check for ambiguity, conflicts, and missing details",
    icon: <SearchIcon className="h-4 w-4" />,
  },
  {
    id: "diagram",
    label: "Generate Diagram",
    description: "Create or update Mermaid diagrams",
    icon: <Workflow className="h-4 w-4" />,
  },
  {
    id: "drift",
    label: "Check Drift",
    description: "Detect drift between blueprints, code, and requirements",
    icon: <GitCompareArrows className="h-4 w-4" />,
  },
];

interface FoundryEditorProps {
  /** Project ID for API calls and agent chat. */
  projectId?: string;
  /** Auth token for collaborative editing. When provided, enables real-time collaboration. */
  authToken?: string;
  /** Display name for the current user in collaboration cursors. */
  userName?: string;
}

export function FoundryEditor({ projectId, authToken, userName }: FoundryEditorProps = {}) {
  const [blueprints] = useState<BlueprintTreeItem[]>([]);
  const [selectedBlueprintId, setSelectedBlueprintId] = useState<string | null>(
    null
  );
  const [showChat, setShowChat] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [driftAlerts] = useState<DriftAlert[]>([]);
  const [versions] = useState<VersionInfo[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);

  const selectedBlueprint =
    blueprints.find((b) => b.id === selectedBlueprintId) ?? null;

  const handleActionClick = (actionId: string) => {
    if (actionId === "drift") {
      setShowChat(true);
    }
  };

  const openDriftAlerts = driftAlerts.filter((a) => a.status === "open");

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Blueprint Tree Sidebar */}
      <BlueprintTree
        blueprints={blueprints}
        selectedBlueprintId={selectedBlueprintId}
        onSelectBlueprint={setSelectedBlueprintId}
        onNewBlueprint={() => {
          /* open new blueprint dialog */
        }}
        onRename={() => {
          /* open rename dialog */
        }}
        onDelete={() => {
          /* confirm delete */
        }}
        onDuplicate={() => {
          /* duplicate blueprint */
        }}
        onReorder={() => {
          /* handle reorder */
        }}
        onInitializeTemplate={() => {
          /* open template selector */
        }}
      />

      {/* Editor Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Drift Alert Banner */}
        {openDriftAlerts.length > 0 && (
          <div
            className="flex items-center gap-2 border-b border-destructive/30 bg-destructive/10 px-6 py-2"
            role="alert"
          >
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span className="text-sm text-destructive">
              {openDriftAlerts.length} drift alert
              {openDriftAlerts.length > 1 ? "s" : ""} detected.
            </span>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto text-xs border-destructive/50 text-destructive hover:bg-destructive/10"
              onClick={() => {
                setShowChat(true);
                handleActionClick("drift");
              }}
            >
              Resolve
            </Button>
          </div>
        )}

        {selectedBlueprint ? (
          <>
            {/* Editor Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <FileCode className="h-4 w-4 shrink-0 text-muted-foreground" />
                <h2 className="text-lg font-semibold truncate">
                  {selectedBlueprint.title}
                </h2>
                <Badge variant="secondary">
                  {TYPE_LABELS[selectedBlueprint.type]}
                </Badge>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {/* Version Selector */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1">
                      {selectedVersion
                        ? `v${versions.find((v) => v.id === selectedVersion)?.versionNumber ?? ""}`
                        : "Current"}
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => setSelectedVersion(null)}
                    >
                      Current (draft)
                    </DropdownMenuItem>
                    {versions.map((v) => (
                      <DropdownMenuItem
                        key={v.id}
                        onClick={() => setSelectedVersion(v.id)}
                      >
                        v{v.versionNumber}
                        {v.changeSummary ? ` - ${v.changeSummary}` : ""}
                      </DropdownMenuItem>
                    ))}
                    {versions.length === 0 && (
                      <DropdownMenuItem disabled>
                        No saved versions yet
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Version History Toggle */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowVersionHistory(!showVersionHistory)}
                  aria-pressed={showVersionHistory}
                >
                  <History className="mr-1 h-3.5 w-3.5" /> History
                </Button>

                {/* Export */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Download className="mr-1 h-3.5 w-3.5" /> Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Export as Markdown</DropdownMenuItem>
                    <DropdownMenuItem>Export as DOCX</DropdownMenuItem>
                    <DropdownMenuItem>Export as PDF</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Agent Toggle */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowChat(!showChat)}
                  aria-label={showChat ? "Hide agent panel" : "Show agent panel"}
                  aria-pressed={showChat}
                >
                  {showChat ? (
                    <PanelRightClose className="mr-1 h-3.5 w-3.5" />
                  ) : (
                    <PanelRightOpen className="mr-1 h-3.5 w-3.5" />
                  )}
                  Agent
                </Button>
              </div>
            </div>

            {/* Editor Content */}
            <div className="flex flex-1 overflow-hidden">
              <div className="flex-1 overflow-auto p-6">
                <div className="mx-auto max-w-3xl">
                  <RichEditor
                    placeholder="Start writing your blueprint..."
                    showToolbar
                    showBubbleMenu
                    showWordCount
                    documentId={selectedBlueprint.id}
                    collaborative={!!authToken}
                    authToken={authToken}
                    userName={userName}
                  />
                </div>
              </div>

              {/* Version History Panel */}
              {showVersionHistory && (
                <div className="w-72 border-l border-border overflow-auto">
                  <div className="flex items-center justify-between border-b border-border px-4 py-3">
                    <h3 className="text-sm font-semibold">Version History</h3>
                    <button
                      onClick={() => setShowVersionHistory(false)}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Close version history"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="p-4">
                    {versions.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-8">
                        No versions saved yet. Changes are auto-saved as drafts.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {versions.map((v) => (
                          <button
                            key={v.id}
                            onClick={() => setSelectedVersion(v.id)}
                            className={cn(
                              "w-full rounded-md border p-3 text-left text-xs transition-colors",
                              selectedVersion === v.id
                                ? "border-primary bg-accent"
                                : "border-border hover:bg-accent/50"
                            )}
                          >
                            <div className="font-medium">
                              Version {v.versionNumber}
                            </div>
                            {v.changeSummary && (
                              <div className="mt-1 text-muted-foreground">
                                {v.changeSummary}
                              </div>
                            )}
                            <div className="mt-1 text-muted-foreground/70">
                              {new Date(v.createdAt).toLocaleDateString()}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <FileCode className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-sm text-muted-foreground">
                Select a blueprint or initialize from a template
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Use the sidebar to browse and manage blueprints
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Agent Chat Panel */}
      {showChat && (
        <ChatPanel
          projectId={projectId}
          agentType="foundry"
          title="Foundry Agent"
          contextDocumentId={selectedBlueprintId ?? undefined}
          className="w-80"
          actions={FOUNDRY_AGENT_ACTIONS}
        />
      )}
    </div>
  );
}
