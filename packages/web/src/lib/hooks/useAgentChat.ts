// SPDX-License-Identifier: AGPL-3.0
"use client";

import { useState, useCallback, useRef } from "react";
import { streamSSE } from "@/lib/api-client";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface AgentStreamEvent {
  type: string;
  content?: string;
  toolName?: string;
  args?: Record<string, unknown>;
  result?: unknown;
  suggestion?: unknown;
  message?: string;
}

export function useAgentChat(projectId: string | undefined) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (content: string, agentType: string, contextDocumentId?: string) => {
      if (!projectId) return;

      // Add user message
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
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsLoading(true);

      abortRef.current?.abort();
      const abortController = new AbortController();
      abortRef.current = abortController;

      await streamSSE(
        `/projects/${projectId}/agents/stream`,
        {
          agentType,
          projectId,
          message: content,
          contextDocumentId,
        },
        {
          signal: abortController.signal,
          onEvent: (event) => {
            const evt = event as AgentStreamEvent;
            if (evt.type === "text-delta" && evt.content) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + evt.content }
                    : m
                )
              );
            } else if (evt.type === "tool-call" && evt.toolName) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        content:
                          m.content +
                          `\n[Using tool: ${evt.toolName}]\n`,
                      }
                    : m
                )
              );
            } else if (evt.type === "error" && evt.message) {
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
            } else if (evt.type === "done") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, isStreaming: false } : m
                )
              );
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
    },
    [projectId]
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
    setMessages((prev) =>
      prev.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m))
    );
  }, []);

  return { messages, isLoading, sendMessage, cancel, setMessages };
}
