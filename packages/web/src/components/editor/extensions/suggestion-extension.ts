// SPDX-License-Identifier: AGPL-3.0
import { Mark, mergeAttributes } from "@tiptap/react";

declare module "@tiptap/react" {
  interface Commands<ReturnType> {
    suggestionMark: {
      setSuggestionAdd: (attrs?: {
        suggestionId?: string;
      }) => ReturnType;
      setSuggestionDelete: (attrs?: {
        suggestionId?: string;
      }) => ReturnType;
      acceptSuggestion: (suggestionId: string) => ReturnType;
      rejectSuggestion: (suggestionId: string) => ReturnType;
    };
  }
}

export const SuggestionAdd = Mark.create({
  name: "suggestionAdd",

  addAttributes() {
    return {
      suggestionId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-suggestion-id"),
        renderHTML: (attributes) => {
          if (!attributes.suggestionId) return {};
          return { "data-suggestion-id": attributes.suggestionId };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'ins[data-suggestion-id]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "ins",
      mergeAttributes(HTMLAttributes, {
        class:
          "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 no-underline border-b-2 border-green-400",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setSuggestionAdd:
        (attrs) =>
        ({ commands }) => {
          return commands.setMark(this.name, attrs);
        },
      acceptSuggestion:
        (_suggestionId) =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
      rejectSuggestion:
        (_suggestionId) =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
    };
  },
});

export const SuggestionDelete = Mark.create({
  name: "suggestionDelete",

  addAttributes() {
    return {
      suggestionId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-suggestion-id"),
        renderHTML: (attributes) => {
          if (!attributes.suggestionId) return {};
          return { "data-suggestion-id": attributes.suggestionId };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'del[data-suggestion-id]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "del",
      mergeAttributes(HTMLAttributes, {
        class:
          "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 line-through border-b-2 border-red-400",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setSuggestionDelete:
        (attrs) =>
        ({ commands }) => {
          return commands.setMark(this.name, attrs);
        },
    };
  },
});
