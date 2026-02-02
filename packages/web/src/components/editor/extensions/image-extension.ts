// SPDX-License-Identifier: AGPL-3.0
import Image from "@tiptap/extension-image";

export const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) => element.getAttribute("width"),
        renderHTML: (attributes) => {
          if (!attributes.width) return {};
          return { width: attributes.width };
        },
      },
      height: {
        default: null,
        parseHTML: (element) => element.getAttribute("height"),
        renderHTML: (attributes) => {
          if (!attributes.height) return {};
          return { height: attributes.height };
        },
      },
      align: {
        default: "center",
        parseHTML: (element) =>
          element.getAttribute("data-align") || "center",
        renderHTML: (attributes) => {
          return { "data-align": attributes.align };
        },
      },
    };
  },
});
