// SPDX-License-Identifier: AGPL-3.0
import Mention from "@tiptap/extension-mention";
import { type SuggestionOptions } from "@tiptap/suggestion";
import { ReactRenderer } from "@tiptap/react";
import tippy, { type Instance as TippyInstance } from "tippy.js";

export interface MentionItem {
  id: string;
  label: string;
  type: "user" | "artifact" | "document";
}

export type MentionSuggestionFn = (query: string) => Promise<MentionItem[]>;

function createSuggestion(
  fetchItems: MentionSuggestionFn,
  MentionListComponent: React.ComponentType<MentionListProps>
): Omit<SuggestionOptions<MentionItem>, "editor"> {
  return {
    items: async ({ query }) => {
      return fetchItems(query);
    },
    render: () => {
      let component: ReactRenderer<MentionListRef> | null = null;
      let popup: TippyInstance[] | null = null;

      return {
        onStart: (props) => {
          component = new ReactRenderer(MentionListComponent, {
            props,
            editor: props.editor,
          });

          if (!props.clientRect) return;

          popup = tippy("body", {
            getReferenceClientRect: props.clientRect as () => DOMRect,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: "manual",
            placement: "bottom-start",
          });
        },
        onUpdate(props) {
          component?.updateProps(props);
          if (props.clientRect && popup?.[0]) {
            popup[0].setProps({
              getReferenceClientRect: props.clientRect as () => DOMRect,
            });
          }
        },
        onKeyDown(props) {
          if (props.event.key === "Escape") {
            popup?.[0]?.hide();
            return true;
          }
          return (component?.ref as MentionListRef)?.onKeyDown?.(props) ?? false;
        },
        onExit() {
          popup?.[0]?.destroy();
          component?.destroy();
        },
      };
    },
  };
}

export interface MentionListProps {
  items: MentionItem[];
  command: (item: MentionItem) => void;
}

export interface MentionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

export function createMentionExtension(
  fetchItems: MentionSuggestionFn,
  MentionListComponent: React.ComponentType<MentionListProps>
) {
  return Mention.configure({
    HTMLAttributes: {
      class: "mention bg-primary/10 rounded px-1 py-0.5 text-primary font-medium",
    },
    suggestion: createSuggestion(fetchItems, MentionListComponent),
  });
}
