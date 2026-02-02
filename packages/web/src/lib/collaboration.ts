// SPDX-License-Identifier: AGPL-3.0

import { HocuspocusProvider } from "@hocuspocus/provider";
import * as Y from "yjs";

const HOCUSPOCUS_URL =
  process.env["NEXT_PUBLIC_HOCUSPOCUS_URL"] || "ws://localhost:3002";

/** Random pastel color for collaboration cursors */
function randomCursorColor(): string {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 70%, 60%)`;
}

export interface CollaborationUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  color: string;
}

export interface CreateProviderOptions {
  documentId: string;
  token: string;
  userName: string;
  userColor?: string;
  onSynced?: () => void;
  onDisconnect?: () => void;
  onConnect?: () => void;
}

export function createCollaborationProvider({
  documentId,
  token,
  userName,
  userColor,
  onSynced,
  onDisconnect,
  onConnect,
}: CreateProviderOptions): { provider: HocuspocusProvider; ydoc: Y.Doc } {
  const ydoc = new Y.Doc();
  const color = userColor ?? randomCursorColor();

  const provider = new HocuspocusProvider({
    url: HOCUSPOCUS_URL,
    name: `doc:${documentId}`,
    document: ydoc,
    token,
    onSynced,
    onDisconnect,
    onConnect,
  });

  // Set awareness local state for cursor display
  provider.setAwarenessField("user", {
    name: userName,
    color,
  });

  return { provider, ydoc };
}
