// SPDX-License-Identifier: AGPL-3.0
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { HocuspocusProvider } from "@hocuspocus/provider";
import type * as Y from "yjs";
import {
  createCollaborationProvider,
  type CollaborationUser,
} from "@/lib/collaboration";

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

interface AwarenessState {
  user?: {
    name: string;
    color: string;
  };
}

export interface UseCollaborationOptions {
  documentId: string;
  token: string;
  userName: string;
  userColor?: string;
  enabled?: boolean;
}

export interface UseCollaborationReturn {
  provider: HocuspocusProvider | null;
  ydoc: Y.Doc | null;
  status: ConnectionStatus;
  connectedUsers: CollaborationUser[];
}

export function useCollaboration({
  documentId,
  token,
  userName,
  userColor,
  enabled = true,
}: UseCollaborationOptions): UseCollaborationReturn {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [connectedUsers, setConnectedUsers] = useState<CollaborationUser[]>([]);
  const providerRef = useRef<HocuspocusProvider | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);

  const updateAwareness = useCallback(() => {
    const provider = providerRef.current;
    if (!provider) return;

    const states = provider.awareness?.getStates();
    if (!states) return;

    const userList: CollaborationUser[] = [];
    states.forEach((state: AwarenessState, clientId: number) => {
      // Skip our own client
      if (clientId === provider.awareness?.clientID) return;
      if (!state.user) return;
      userList.push({
        id: String(clientId),
        name: state.user.name,
        email: "",
        avatarUrl: null,
        color: state.user.color,
      });
    });
    setConnectedUsers(userList);
  }, []);

  useEffect(() => {
    if (!enabled || !documentId || !token) {
      setStatus("disconnected");
      return;
    }

    const { provider, ydoc } = createCollaborationProvider({
      documentId,
      token,
      userName,
      userColor,
      onConnect: () => setStatus("connected"),
      onDisconnect: () => setStatus("disconnected"),
      onSynced: () => setStatus("connected"),
    });

    providerRef.current = provider;
    ydocRef.current = ydoc;
    setStatus("connecting");

    // Track awareness changes
    provider.awareness?.on("change", updateAwareness);

    return () => {
      provider.awareness?.off("change", updateAwareness);
      provider.destroy();
      ydoc.destroy();
      providerRef.current = null;
      ydocRef.current = null;
      setConnectedUsers([]);
      setStatus("disconnected");
    };
  }, [documentId, token, userName, userColor, enabled, updateAwareness]);

  return {
    provider: providerRef.current,
    ydoc: ydocRef.current,
    status,
    connectedUsers,
  };
}
