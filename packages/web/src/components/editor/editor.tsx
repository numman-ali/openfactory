// SPDX-License-Identifier: AGPL-3.0
"use client";

import * as React from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";

import { cn } from "@/lib/utils";
import { EditorToolbar } from "./toolbar";
import { EditorBubbleMenu } from "./bubble-menu";
import {
  useCollaboration,
  type ConnectionStatus,
  type UseCollaborationOptions,
} from "@/hooks/useCollaboration";
import type { CollaborationUser } from "@/lib/collaboration";

const lowlight = createLowlight(common);

export interface RichEditorProps {
  content?: string;
  placeholder?: string;
  editable?: boolean;
  characterLimit?: number;
  showToolbar?: boolean;
  showBubbleMenu?: boolean;
  showWordCount?: boolean;
  className?: string;
  onUpdate?: (props: { editor: Editor }) => void;
  onBlur?: (props: { editor: Editor }) => void;
  /** Document ID for collaborative editing. Required when collaborative=true. */
  documentId?: string;
  /** Enable real-time collaboration. Requires documentId. */
  collaborative?: boolean;
  /** Auth token for Hocuspocus connection. Required when collaborative=true. */
  authToken?: string;
  /** Display name for the current user in collaboration cursors. */
  userName?: string;
  /** Cursor color for the current user in collaboration. */
  userColor?: string;
}

function ConnectionStatusBanner({ status }: { status: ConnectionStatus }) {
  if (status === "connected") return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-4 py-1.5 text-xs font-medium",
        status === "connecting" &&
          "bg-yellow-50 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200",
        status === "disconnected" &&
          "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200"
      )}
      role="status"
      aria-live="polite"
    >
      <span
        className={cn(
          "inline-block h-2 w-2 rounded-full",
          status === "connecting" && "bg-yellow-500 animate-pulse",
          status === "disconnected" && "bg-red-500"
        )}
      />
      {status === "connecting" && "Connecting to collaboration server..."}
      {status === "disconnected" &&
        "Disconnected from collaboration server. Reconnecting..."}
    </div>
  );
}

function ConnectedUsersAvatars({ users }: { users: CollaborationUser[] }) {
  if (users.length === 0) return null;

  return (
    <div className="flex items-center gap-1" aria-label="Connected users">
      {users.map((user) => (
        <div
          key={user.id}
          className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-medium text-white"
          style={{ backgroundColor: user.color }}
          title={user.name}
          aria-label={user.name}
        >
          {user.name.charAt(0).toUpperCase()}
        </div>
      ))}
      <span className="ml-1 text-xs text-muted-foreground">
        {users.length} online
      </span>
    </div>
  );
}

function CollaborativeEditor({
  content = "",
  placeholder = "Start writing...",
  editable = true,
  characterLimit,
  showToolbar = true,
  showBubbleMenu = true,
  showWordCount = false,
  className,
  onUpdate,
  onBlur,
  documentId,
  authToken,
  userName = "Anonymous",
  userColor,
}: RichEditorProps & { documentId: string; authToken: string }) {
  const collabOptions: UseCollaborationOptions = React.useMemo(
    () => ({
      documentId,
      token: authToken,
      userName,
      userColor,
      enabled: true,
    }),
    [documentId, authToken, userName, userColor]
  );

  const { provider, ydoc, status, connectedUsers } =
    useCollaboration(collabOptions);

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          codeBlock: false,
          heading: { levels: [1, 2, 3] },
          // Disable built-in undo/redo when collaborating (Yjs handles undo/redo)
          undoRedo: false,
        }),
        Placeholder.configure({ placeholder }),
        CharacterCount.configure(
          characterLimit ? { limit: characterLimit } : {}
        ),
        TaskList,
        TaskItem.configure({ nested: true }),
        Table.configure({ resizable: true }),
        TableRow,
        TableCell,
        TableHeader,
        CodeBlockLowlight.configure({ lowlight }),
        Link.configure({
          openOnClick: false,
          HTMLAttributes: { class: "text-primary underline cursor-pointer" },
        }),
        Image.configure({
          HTMLAttributes: { class: "rounded-md max-w-full" },
        }),
        Underline,
        Highlight.configure({ multicolor: true }),
        TextAlign.configure({ types: ["heading", "paragraph"] }),
        ...(ydoc
          ? [
              Collaboration.configure({
                document: ydoc,
              }),
              ...(provider
                ? [
                    CollaborationCursor.configure({
                      provider,
                    }),
                  ]
                : []),
            ]
          : []),
      ],
      content: ydoc ? undefined : content,
      editable,
      onUpdate: onUpdate
        ? ({ editor: ed }) => onUpdate({ editor: ed as Editor })
        : undefined,
      onBlur: onBlur
        ? ({ editor: ed }) => onBlur({ editor: ed as Editor })
        : undefined,
      editorProps: {
        attributes: {
          class: cn(
            "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[150px] px-4 py-3",
            "[&_table]:border-collapse [&_table]:w-full",
            "[&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:p-2 [&_th]:text-left",
            "[&_td]:border [&_td]:border-border [&_td]:p-2",
            "[&_ul[data-type=taskList]]:list-none [&_ul[data-type=taskList]]:pl-0",
            "[&_ul[data-type=taskList]_li]:flex [&_ul[data-type=taskList]_li]:items-start [&_ul[data-type=taskList]_li]:gap-2",
            "[&_pre]:bg-muted [&_pre]:rounded-md [&_pre]:p-4",
            "[&_code]:bg-muted [&_code]:rounded [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-sm",
            "[&_img]:rounded-md [&_img]:max-w-full"
          ),
        },
      },
    },
    [ydoc, provider]
  );

  if (!editor) {
    return null;
  }

  const characterCount = editor.storage.characterCount as {
    characters: () => number;
    words: () => number;
  };

  return (
    <div
      className={cn(
        "rounded-md border border-input bg-background",
        className
      )}
    >
      <ConnectionStatusBanner status={status} />
      {showToolbar && (
        <div className="flex items-center justify-between border-b px-2 py-1">
          <EditorToolbar editor={editor} className="border-b-0" />
          <ConnectedUsersAvatars users={connectedUsers} />
        </div>
      )}
      {showBubbleMenu && <EditorBubbleMenu editor={editor} />}
      <EditorContent editor={editor} />
      {showWordCount && (
        <div className="flex items-center justify-end gap-4 border-t px-4 py-2 text-xs text-muted-foreground">
          <span>{characterCount.words()} words</span>
          <span>
            {characterCount.characters()}
            {characterLimit ? ` / ${characterLimit}` : ""} characters
          </span>
        </div>
      )}
    </div>
  );
}

function StandaloneEditor({
  content = "",
  placeholder = "Start writing...",
  editable = true,
  characterLimit,
  showToolbar = true,
  showBubbleMenu = true,
  showWordCount = false,
  className,
  onUpdate,
  onBlur,
}: RichEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({ placeholder }),
      CharacterCount.configure(characterLimit ? { limit: characterLimit } : {}),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      CodeBlockLowlight.configure({ lowlight }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-primary underline cursor-pointer" },
      }),
      Image.configure({
        HTMLAttributes: { class: "rounded-md max-w-full" },
      }),
      Underline,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content,
    editable,
    onUpdate: onUpdate
      ? ({ editor: ed }) => onUpdate({ editor: ed as Editor })
      : undefined,
    onBlur: onBlur
      ? ({ editor: ed }) => onBlur({ editor: ed as Editor })
      : undefined,
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[150px] px-4 py-3",
          "[&_table]:border-collapse [&_table]:w-full",
          "[&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:p-2 [&_th]:text-left",
          "[&_td]:border [&_td]:border-border [&_td]:p-2",
          "[&_ul[data-type=taskList]]:list-none [&_ul[data-type=taskList]]:pl-0",
          "[&_ul[data-type=taskList]_li]:flex [&_ul[data-type=taskList]_li]:items-start [&_ul[data-type=taskList]_li]:gap-2",
          "[&_pre]:bg-muted [&_pre]:rounded-md [&_pre]:p-4",
          "[&_code]:bg-muted [&_code]:rounded [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-sm",
          "[&_img]:rounded-md [&_img]:max-w-full"
        ),
      },
    },
  });

  if (!editor) {
    return null;
  }

  const characterCount = editor.storage.characterCount as {
    characters: () => number;
    words: () => number;
  };

  return (
    <div
      className={cn(
        "rounded-md border border-input bg-background",
        className
      )}
    >
      {showToolbar && <EditorToolbar editor={editor} />}
      {showBubbleMenu && <EditorBubbleMenu editor={editor} />}
      <EditorContent editor={editor} />
      {showWordCount && (
        <div className="flex items-center justify-end gap-4 border-t px-4 py-2 text-xs text-muted-foreground">
          <span>{characterCount.words()} words</span>
          <span>
            {characterCount.characters()}
            {characterLimit ? ` / ${characterLimit}` : ""} characters
          </span>
        </div>
      )}
    </div>
  );
}

export function RichEditor(props: RichEditorProps) {
  const { collaborative, documentId, authToken } = props;

  if (collaborative && documentId && authToken) {
    return (
      <CollaborativeEditor
        {...props}
        documentId={documentId}
        authToken={authToken}
      />
    );
  }

  return <StandaloneEditor {...props} />;
}

export { type Editor } from "@tiptap/react";
