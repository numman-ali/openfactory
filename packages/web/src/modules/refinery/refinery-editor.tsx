// SPDX-License-Identifier: AGPL-3.0
"use client";

import * as React from "react";
import { useState, useCallback } from "react";
import {
  FileText,
  Download,
  Upload,
  ChevronDown,
  PanelRightOpen,
  PanelRightClose,
  Sparkles,
  MessageSquare,
  HelpCircle,
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
import { ChatPanel, type ChatMessage } from "@/components/agent";
import {
  DocumentTree,
  type DocumentTreeItem,
} from "./document-tree";
type DocType =
  | "product_overview"
  | "feature_requirements"
  | "technical_requirements";

const DOC_TYPE_LABELS: Record<DocType, string> = {
  product_overview: "Product Overview",
  feature_requirements: "Feature Requirements",
  technical_requirements: "Technical Requirements",
};

const REFINERY_AGENT_ACTIONS = [
  {
    id: "initialize",
    label: "Initialize Requirements",
    description: "Getting started flow to set up your project requirements",
    icon: <Sparkles className="h-4 w-4" />,
  },
  {
    id: "review",
    label: "Review Document",
    description: "Flag ambiguity, gaps, conflicts, and duplication",
    icon: <MessageSquare className="h-4 w-4" />,
  },
  {
    id: "qa",
    label: "Quick Q&A",
    description: "Ask questions about requirements and get sourced answers",
    icon: <HelpCircle className="h-4 w-4" />,
  },
];

interface VersionInfo {
  id: string;
  versionNumber: number;
  changeSummary: string | null;
  createdAt: string;
}

const PLACEHOLDER_DOCS: DocumentTreeItem[] = [
  {
    id: "1",
    title: "Product Overview",
    type: "product_overview",
    featureId: null,
    featureName: null,
    sortOrder: 0,
  },
  {
    id: "2",
    title: "Technical Requirements",
    type: "technical_requirements",
    featureId: null,
    featureName: null,
    sortOrder: 1,
  },
];

export function RefineryEditor() {
  const [documents] = useState<DocumentTreeItem[]>(PLACEHOLDER_DOCS);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [showChat, setShowChat] = useState(false);
  const [versions] = useState<VersionInfo[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);

  const selectedDoc = documents.find((d) => d.id === selectedDocId) ?? null;

  const handleSendMessage = useCallback(
    (content: string) => {
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, userMsg]);
    },
    []
  );

  const handleActionClick = useCallback((actionId: string) => {
    const action = REFINERY_AGENT_ACTIONS.find((a) => a.id === actionId);
    if (!action) return;
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: action.label,
      timestamp: new Date(),
    };
    setChatMessages((prev) => [...prev, userMsg]);
  }, []);

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Document Tree Sidebar */}
      <DocumentTree
        documents={documents}
        selectedDocId={selectedDocId}
        onSelectDocument={setSelectedDocId}
        onNewFeature={() => {
          /* open new feature dialog */
        }}
        onRename={() => {
          /* open rename dialog */
        }}
        onDelete={() => {
          /* confirm delete */
        }}
        onDuplicate={() => {
          /* duplicate doc */
        }}
        onReorder={() => {
          /* handle reorder */
        }}
        onImport={() => {
          /* open import dialog */
        }}
        onExport={() => {
          /* open export dialog */
        }}
      />

      {/* Editor Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {selectedDoc ? (
          <>
            {/* Editor Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <h2 className="text-lg font-semibold truncate">
                  {selectedDoc.title}
                </h2>
                <Badge variant="secondary">
                  {DOC_TYPE_LABELS[selectedDoc.type]}
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
                    <DropdownMenuItem onClick={() => setSelectedVersion(null)}>
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

                {/* Import */}
                <Button variant="outline" size="sm">
                  <Upload className="mr-1 h-3.5 w-3.5" /> Import
                </Button>

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
            <div className="flex-1 overflow-auto p-6">
              <div className="mx-auto max-w-3xl">
                <RichEditor
                  placeholder="Start writing your requirements..."
                  showToolbar
                  showBubbleMenu
                  showWordCount
                />
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-sm text-muted-foreground">
                Select a document to start editing
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Or create a new feature requirement using the sidebar
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Agent Chat Panel */}
      {showChat && (
        <ChatPanel
          title="Refinery Agent"
          messages={chatMessages}
          onSendMessage={handleSendMessage}
          onActionClick={handleActionClick}
          className="w-80"
          actions={REFINERY_AGENT_ACTIONS}
        />
      )}
    </div>
  );
}
