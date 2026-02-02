// SPDX-License-Identifier: AGPL-3.0
"use client";

import { useState } from "react";
import { FileText, Plus, Search, Upload, Download, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { AgentChatPanel, type ChatMessage } from "@/components/chat/agent-chat-panel";
import { RichEditor } from "@/components/editor";
import { cn } from "@/lib/utils";

type DocType = "product_overview" | "feature_requirements" | "technical_requirements";

interface DocTreeItem {
  id: string;
  title: string;
  type: DocType;
  featureName?: string;
}

const DOC_TYPE_LABELS: Record<DocType, string> = {
  product_overview: "Product Overview",
  feature_requirements: "Feature Requirements",
  technical_requirements: "Technical Requirements",
};

const PLACEHOLDER_DOCS: DocTreeItem[] = [
  { id: "1", title: "Product Overview", type: "product_overview" },
  { id: "2", title: "Technical Requirements", type: "technical_requirements" },
];

export default function RefineryPage() {
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [showChat, setShowChat] = useState(false);

  const handleSendMessage = (content: string) => {
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
    };
    setChatMessages((prev) => [...prev, userMsg]);
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Document Tree Sidebar */}
      <div className="flex w-64 flex-col border-r border-border">
        <div className="flex items-center justify-between p-3">
          <span className="text-sm font-semibold">Documents</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="New document">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search docs..." className="h-8 pl-7 text-xs" />
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="space-y-1 px-2">
            {Object.entries(DOC_TYPE_LABELS).map(([type, label]) => (
              <div key={type}>
                <div className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <ChevronRight className="h-3 w-3" />
                  {label}
                </div>
                {PLACEHOLDER_DOCS.filter((d) => d.type === type).map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => setSelectedDoc(doc.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
                      selectedDoc === doc.id
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/50"
                    )}
                  >
                    <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{doc.title}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </ScrollArea>
        <Separator />
        <div className="flex gap-1 p-2">
          <Button variant="ghost" size="sm" className="flex-1 text-xs">
            <Upload className="mr-1 h-3 w-3" /> Import
          </Button>
          <Button variant="ghost" size="sm" className="flex-1 text-xs">
            <Download className="mr-1 h-3 w-3" /> Export
          </Button>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex flex-1 flex-col">
        {selectedDoc ? (
          <>
            <div className="flex items-center justify-between border-b border-border px-6 py-3">
              <div>
                <h2 className="text-lg font-semibold">
                  {PLACEHOLDER_DOCS.find((d) => d.id === selectedDoc)?.title}
                </h2>
                <Badge variant="secondary" className="mt-1">
                  {DOC_TYPE_LABELS[PLACEHOLDER_DOCS.find((d) => d.id === selectedDoc)?.type ?? "product_overview"]}
                </Badge>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowChat(!showChat)}>
                Agent
              </Button>
            </div>
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
            </div>
          </div>
        )}
      </div>

      {/* Agent Chat Panel */}
      {showChat && (
        <AgentChatPanel
          title="Refinery Agent"
          messages={chatMessages}
          onSendMessage={handleSendMessage}
          className="w-80"
          actions={[
            { id: "draft", label: "Draft Requirements", description: "Generate requirements from artifacts" },
            { id: "review", label: "Review Document", description: "Check for gaps and ambiguity" },
            { id: "organize", label: "Organize Features", description: "Suggest feature restructuring" },
          ]}
        />
      )}
    </div>
  );
}
