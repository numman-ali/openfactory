// SPDX-License-Identifier: AGPL-3.0
"use client";

import * as React from "react";
import { Send, Bot, User, Loader2, Paperclip, Wrench, FileEdit, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { streamSSE } from "@/lib/api-client";

// ─── Agent Types (mirrored from @repo/shared) ───────────────────────────────

export type AgentType = "refinery" | "foundry" | "planner" | "validator";

export interface EditDiff {
  id: string;
  sectionPath?: string;
  operation: "insert" | "replace" | "delete";
  from?: number;
  to?: number;
  newContent?: string;
  oldContent?: string;
  explanation?: string;
}

export interface EditSuggestion {
  id: string;
  documentId: string;
  agentType: AgentType;
  diffs: EditDiff[];
  summary: string;
  contextSources?: string[];
}

interface AgentStreamEvent {
  type: string;
  content?: string;
  toolName?: string;
  args?: Record<string, unknown>;
  result?: unknown;
  suggestion?: EditSuggestion;
  description?: string;
  message?: string;
  usage?: { inputTokens: number; outputTokens: number; model: string };
}

// ─── Message Types ───────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  attachments?: ChatAttachment[];
  toolCalls?: ToolCallInfo[];
  editSuggestion?: EditSuggestion;
  confirmationRequired?: ConfirmationInfo;
}

export interface ChatAttachment {
  id: string;
  name: string;
  type: string;
  url?: string;
}

export interface ToolCallInfo {
  toolName: string;
  args: Record<string, unknown>;
  result?: unknown;
  status: "pending" | "done" | "error";
}

export interface ConfirmationInfo {
  toolName: string;
  args: Record<string, unknown>;
  description: string;
}

export interface AgentAction {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
}

// ─── Component Props ─────────────────────────────────────────────────────────

interface ChatPanelProps {
  projectId: string | undefined;
  agentType: AgentType;
  title?: string;
  actions?: AgentAction[];
  onActionClick?: (actionId: string) => void;
  onEditSuggestion?: (suggestion: EditSuggestion) => void;
  contextDocumentId?: string;
  className?: string;
}

export function ChatPanel({
  projectId,
  agentType,
  title = "Agent",
  actions,
  onActionClick,
  onEditSuggestion,
  contextDocumentId,
  className,
}: ChatPanelProps) {
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [input, setInput] = React.useState("");
  const [pendingFiles, setPendingFiles] = React.useState<File[]>([]);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function sendMessage(content: string) {
    if (!projectId || !content.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
      timestamp: new Date(),
    };

    const assistantId = `assistant-${Date.now()}`;
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isStreaming: true,
      toolCalls: [],
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsLoading(true);

    abortRef.current?.abort();
    const abortController = new AbortController();
    abortRef.current = abortController;

    const isValidUUID = contextDocumentId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(contextDocumentId);
    await streamSSE(
      `/projects/${projectId}/agents/stream`,
      {
        agentType,
        message: content,
        ...(isValidUUID ? { contextDocumentId } : {}),
      },
      {
        signal: abortController.signal,
        onEvent: (raw) => {
          const evt = raw as AgentStreamEvent;
          switch (evt.type) {
            case "text-delta":
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + evt.content }
                    : m
                )
              );
              break;

            case "tool-call":
              if (evt.toolName && evt.args) {
                const toolName = evt.toolName;
                const args = evt.args;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? {
                          ...m,
                          toolCalls: [
                            ...(m.toolCalls ?? []),
                            { toolName, args, status: "pending" as const },
                          ],
                        }
                      : m
                  )
                );
              }
              break;

            case "tool-result":
              setMessages((prev) =>
                prev.map((m) => {
                  if (m.id !== assistantId) return m;
                  const calls = (m.toolCalls ?? []).map((tc) =>
                    tc.toolName === evt.toolName && tc.status === "pending"
                      ? { ...tc, result: evt.result, status: "done" as const }
                      : tc
                  );
                  return { ...m, toolCalls: calls };
                })
              );
              break;

            case "edit-suggestion":
              if (evt.suggestion) {
                const suggestion = evt.suggestion;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, editSuggestion: suggestion }
                      : m
                  )
                );
                onEditSuggestion?.(suggestion);
              }
              break;

            case "confirmation-required":
              if (evt.toolName && evt.args && evt.description) {
                const toolName = evt.toolName;
                const args = evt.args;
                const description = evt.description;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? {
                          ...m,
                          confirmationRequired: { toolName, args, description },
                        }
                      : m
                  )
                );
              }
              break;

            case "error":
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        content: m.content + `\nError: ${evt.message}`,
                        isStreaming: false,
                      }
                    : m
                )
              );
              break;

            case "done":
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, isStreaming: false } : m
                )
              );
              break;
          }
        },
        onError: (err) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content: m.content || `Error: ${err.message}`,
                    isStreaming: false,
                  }
                : m
            )
          );
          setIsLoading(false);
        },
        onDone: () => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, isStreaming: false } : m
            )
          );
          setIsLoading(false);
        },
      }
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    sendMessage(trimmed);
    setInput("");
    setPendingFiles([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setPendingFiles((prev) => [...prev, ...files]);
    e.target.value = "";
  }

  function removePendingFile(index: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function handleCancel() {
    abortRef.current?.abort();
    setIsLoading(false);
    setMessages((prev) =>
      prev.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m))
    );
  }

  return (
    <div
      className={cn(
        "flex h-full flex-col border-l border-border bg-background",
        className
      )}
    >
      <div className="flex h-12 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{title}</span>
        </div>
        {isLoading && (
          <Button variant="ghost" size="sm" onClick={handleCancel} className="text-xs">
            Stop
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 && actions && actions.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="mb-3 text-sm text-muted-foreground">
              How can I help? Choose an action or type a message.
            </p>
            {actions.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => onActionClick?.(action.id)}
                className="flex items-center gap-3 rounded-lg border border-border p-3 text-left text-sm transition-colors hover:bg-accent"
              >
                {action.icon && (
                  <span className="text-muted-foreground">{action.icon}</span>
                )}
                <div>
                  <div className="font-medium">{action.label}</div>
                  {action.description && (
                    <div className="text-xs text-muted-foreground">
                      {action.description}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((message) => (
              <div key={message.id}>
                <div
                  className={cn(
                    "flex gap-3",
                    message.role === "user" && "flex-row-reverse"
                  )}
                >
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className="text-xs">
                      {message.role === "user" ? (
                        <User className="h-3.5 w-3.5" />
                      ) : (
                        <Bot className="h-3.5 w-3.5" />
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={cn(
                      "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    )}
                  >
                    <div className="whitespace-pre-wrap">{message.content}</div>
                    {message.isStreaming && (
                      <span className="ml-1 inline-block animate-pulse">|</span>
                    )}
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {message.attachments.map((att) => (
                          <span
                            key={att.id}
                            className="inline-flex items-center gap-1 rounded bg-background/50 px-2 py-0.5 text-xs"
                          >
                            <Paperclip className="h-3 w-3" />
                            {att.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Tool calls */}
                {message.toolCalls && message.toolCalls.length > 0 && (
                  <div className="ml-10 mt-2 space-y-1">
                    {message.toolCalls.map((tc, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 rounded border border-border px-2 py-1 text-xs text-muted-foreground"
                      >
                        <Wrench className="h-3 w-3 shrink-0" />
                        <span className="font-mono">{tc.toolName}</span>
                        {tc.status === "pending" && (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        )}
                        {tc.status === "done" && (
                          <Badge variant="secondary" className="text-[10px] px-1 py-0">
                            done
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Edit suggestion */}
                {message.editSuggestion && (
                  <div className="ml-10 mt-2 rounded border border-border p-2">
                    <div className="flex items-center gap-2 text-xs font-medium">
                      <FileEdit className="h-3.5 w-3.5 text-blue-500" />
                      Edit Suggestion
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {message.editSuggestion.summary}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {message.editSuggestion.diffs.length} change{message.editSuggestion.diffs.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                )}

                {/* Confirmation required */}
                {message.confirmationRequired && (
                  <div className="ml-10 mt-2 rounded border border-yellow-300 bg-yellow-50 p-2 dark:border-yellow-700 dark:bg-yellow-950">
                    <div className="flex items-center gap-2 text-xs font-medium text-yellow-800 dark:text-yellow-200">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Confirmation Required
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {message.confirmationRequired.description}
                    </p>
                  </div>
                )}
              </div>
            ))}
            {isLoading && !messages.some((m) => m.isStreaming) && (
              <div className="flex gap-3">
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarFallback className="text-xs">
                    <Bot className="h-3.5 w-3.5" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex items-center gap-1.5 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Thinking...
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      <form onSubmit={handleSubmit} className="border-t border-border p-3">
        {pendingFiles.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {pendingFiles.map((file, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 rounded-md border bg-muted px-2 py-1 text-xs"
              >
                <Paperclip className="h-3 w-3" />
                {file.name}
                <button
                  type="button"
                  onClick={() => removePendingFile(idx)}
                  className="ml-1 text-muted-foreground hover:text-foreground"
                  aria-label={`Remove ${file.name}`}
                >
                  x
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            aria-label="Attach files"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Attach file"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask the agent..."
              rows={1}
              className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              aria-label="Chat message input"
            />
          </div>
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
