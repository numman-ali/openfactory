// SPDX-License-Identifier: AGPL-3.0
import Link from "@tiptap/extension-link";

export interface InternalLinkAttrs {
  href: string;
  targetType: "artifact" | "prd-section" | "blueprint" | "work-order";
  targetId: string;
}

export const InternalLink = Link.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      targetType: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-target-type"),
        renderHTML: (attributes) => {
          if (!attributes.targetType) return {};
          return { "data-target-type": attributes.targetType };
        },
      },
      targetId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-target-id"),
        renderHTML: (attributes) => {
          if (!attributes.targetId) return {};
          return { "data-target-id": attributes.targetId };
        },
      },
    };
  },
});
