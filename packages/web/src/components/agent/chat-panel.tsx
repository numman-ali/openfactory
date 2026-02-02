// SPDX-License-Identifier: AGPL-3.0
"use client";

import * as React from "react";
import { Send, Bot, User, Loader2, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  attachments?: ChatAttachment[];
}

export interface ChatAttachment {
  id: string;
  name: string;
  type: string;
  url?: string;
}

export interface AgentAction {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
}

interface ChatPanelProps {
  title?: string;
  messages: ChatMessage[];
  actions?: AgentAction[];
  isLoading?: boolean;
  onSendMessage: (content: string, attachments?: File[]) => void;
  onActionClick?: (actionId: string) => void;
  className?: string;
}

export function ChatPanel({
  title = "Agent",
  messages,
  actions,
  isLoading = false,
  onSendMessage,
  onActionClick,
  className,
}: ChatPanelProps) {
  const [input, setInput] = React.useState("");
  const [pendingFiles, setPendingFiles] = React.useState<File[]>([]);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    onSendMessage(trimmed, pendingFiles.length > 0 ? pendingFiles : undefined);
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
              <div
                key={message.id}
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
