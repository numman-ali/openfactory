// SPDX-License-Identifier: AGPL-3.0
import { Mark, mergeAttributes } from "@tiptap/react";

declare module "@tiptap/react" {
  interface Commands<ReturnType> {
    comment: {
      setComment: (attrs: { commentId: string }) => ReturnType;
      unsetComment: () => ReturnType;
    };
  }
}

export interface CommentThread {
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  resolved: boolean;
  replies: CommentReply[];
}

export interface CommentReply {
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  createdAt: string;
}

export const Comment = Mark.create({
  name: "comment",

  addAttributes() {
    return {
      commentId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-comment-id"),
        renderHTML: (attributes) => {
          if (!attributes.commentId) return {};
          return { "data-comment-id": attributes.commentId };
        },
      },
      resolved: {
        default: false,
        parseHTML: (element) =>
          element.getAttribute("data-resolved") === "true",
        renderHTML: (attributes) => {
          return { "data-resolved": String(attributes.resolved) };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: "mark[data-comment-id]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "mark",
      mergeAttributes(HTMLAttributes, {
        class:
          HTMLAttributes["data-resolved"] === "true"
            ? "bg-muted/50 border-b border-dashed border-muted-foreground/30"
            : "bg-yellow-100 dark:bg-yellow-900/30 border-b-2 border-yellow-400 cursor-pointer",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setComment:
        (attrs) =>
        ({ commands }) => {
          return commands.setMark(this.name, attrs);
        },
      unsetComment:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
    };
  },
});
