// SPDX-License-Identifier: AGPL-3.0
import { Node, mergeAttributes } from "@tiptap/react";

declare module "@tiptap/react" {
  interface Commands<ReturnType> {
    mermaidBlock: {
      insertMermaidBlock: (attrs?: { code?: string }) => ReturnType;
    };
  }
}

export const MermaidBlock = Node.create({
  name: "mermaidBlock",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      code: {
        default: "graph TD\n  A --> B",
      },
      showPreview: {
        default: true,
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="mermaid-block"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "mermaid-block" }),
    ];
  },

  addCommands() {
    return {
      insertMermaidBlock:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs,
          });
        },
    };
  },
});
