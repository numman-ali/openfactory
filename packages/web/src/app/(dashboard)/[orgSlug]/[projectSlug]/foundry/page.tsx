// SPDX-License-Identifier: AGPL-3.0
"use client";

import { useState } from "react";
import { FileCode, Plus, Search, AlertTriangle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { AgentChatPanel, type ChatMessage } from "@/components/chat/agent-chat-panel";
import { cn } from "@/lib/utils";

type BlueprintType = "foundation_blueprint" | "system_diagram" | "feature_blueprint";

interface BlueprintItem {
  id: string;
  title: string;
  type: BlueprintType;
}

const TYPE_LABELS: Record<BlueprintType, string> = {
  foundation_blueprint: "Foundations",
  system_diagram: "System Diagrams",
  feature_blueprint: "Feature Blueprints",
};

const PLACEHOLDER_BLUEPRINTS: BlueprintItem[] = [];

export default function FoundryPage() {
  const [selectedBlueprint, setSelectedBlueprint] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [showChat, setShowChat] = useState(false);
  const [driftAlerts] = useState(0);

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
      {/* Blueprint Tree Sidebar */}
      <div className="flex w-64 flex-col border-r border-border">
        <div className="flex items-center justify-between p-3">
          <span className="text-sm font-semibold">Blueprints</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="New blueprint">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search blueprints..." className="h-8 pl-7 text-xs" />
          </div>
        </div>
        {driftAlerts > 0 && (
          <div className="mx-3 mb-2 flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <AlertTriangle className="h-3.5 w-3.5" />
            {driftAlerts} drift alert{driftAlerts > 1 ? "s" : ""}
          </div>
        )}
        <ScrollArea className="flex-1">
          <div className="space-y-1 px-2">
            {(Object.entries(TYPE_LABELS) as [BlueprintType, string][]).map(([type, label]) => (
              <div key={type}>
                <div className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <ChevronRight className="h-3 w-3" />
                  {label}
                </div>
                {PLACEHOLDER_BLUEPRINTS.filter((b) => b.type === type).map((bp) => (
                  <button
                    key={bp.id}
                    onClick={() => setSelectedBlueprint(bp.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
                      selectedBlueprint === bp.id
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/50"
                    )}
                  >
                    <FileCode className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{bp.title}</span>
                  </button>
                ))}
                {PLACEHOLDER_BLUEPRINTS.filter((b) => b.type === type).length === 0 && (
                  <p className="px-3 py-1 text-xs text-muted-foreground/60 italic">No blueprints yet</p>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
        <Separator />
        <div className="p-2">
          <Button variant="outline" size="sm" className="w-full text-xs">
            Initialize from Template
          </Button>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex flex-1 flex-col">
        {selectedBlueprint ? (
          <>
            <div className="flex items-center justify-between border-b border-border px-6 py-3">
              <div>
                <h2 className="text-lg font-semibold">Blueprint Title</h2>
                <Badge variant="secondary" className="mt-1">Foundation</Badge>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowChat(!showChat)}>
                Agent
              </Button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <div className="mx-auto max-w-3xl">
                <p className="text-muted-foreground">
                  TipTap editor with Mermaid diagram support will render here.
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <FileCode className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-sm text-muted-foreground">
                Select a blueprint or initialize from a template
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Agent Chat Panel */}
      {showChat && (
        <AgentChatPanel
          title="Foundry Agent"
          messages={chatMessages}
          onSendMessage={handleSendMessage}
          className="w-80"
          actions={[
            { id: "draft", label: "Draft Blueprint", description: "Generate blueprint from requirements" },
            { id: "review", label: "Review Blueprint", description: "Check for gaps and conflicts" },
            { id: "diagram", label: "Generate Diagram", description: "Create Mermaid diagram" },
            { id: "sync", label: "Sync with Code", description: "Detect code drift" },
          ]}
        />
      )}
    </div>
  );
}
