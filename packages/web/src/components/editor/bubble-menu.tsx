// SPDX-License-Identifier: AGPL-3.0
"use client";

import * as React from "react";
import { BubbleMenuPlugin, type BubbleMenuPluginProps } from "@tiptap/extension-bubble-menu";
import type { Editor } from "@tiptap/react";
import { Bold, Italic, Strikethrough, Code, Link2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Toggle } from "@/components/ui/toggle";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface EditorBubbleMenuProps {
  editor: Editor;
}

export function EditorBubbleMenu({ editor }: EditorBubbleMenuProps) {
  const [linkUrl, setLinkUrl] = React.useState("");
  const [linkOpen, setLinkOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!menuRef.current) return;

    const pluginKey = "bubbleMenu";
    const options: BubbleMenuPluginProps = {
      pluginKey,
      editor,
      element: menuRef.current,
      shouldShow: ({ editor: ed, state }) => {
        const { selection } = state;
        const { empty } = selection;
        if (empty) return false;
        if (ed.isActive("codeBlock")) return false;
        return true;
      },
    };

    const plugin = BubbleMenuPlugin(options);
    editor.registerPlugin(plugin);

    return () => {
      editor.unregisterPlugin(pluginKey);
    };
  }, [editor]);

  function insertLink() {
    if (!linkUrl) return;
    editor.chain().focus().setLink({ href: linkUrl }).run();
    setLinkUrl("");
    setLinkOpen(false);
  }

  return (
    <div
      ref={menuRef}
      className={cn(
        "flex items-center gap-0.5 rounded-md border bg-background p-1 shadow-md"
      )}
      style={{ visibility: "hidden" }}
    >
      <Toggle
        size="sm"
        pressed={editor.isActive("bold")}
        onPressedChange={() => editor.chain().focus().toggleBold().run()}
        aria-label="Bold"
      >
        <Bold className="h-3.5 w-3.5" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("italic")}
        onPressedChange={() => editor.chain().focus().toggleItalic().run()}
        aria-label="Italic"
      >
        <Italic className="h-3.5 w-3.5" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("strike")}
        onPressedChange={() => editor.chain().focus().toggleStrike().run()}
        aria-label="Strikethrough"
      >
        <Strikethrough className="h-3.5 w-3.5" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("code")}
        onPressedChange={() => editor.chain().focus().toggleCode().run()}
        aria-label="Inline code"
      >
        <Code className="h-3.5 w-3.5" />
      </Toggle>

      <Popover open={linkOpen} onOpenChange={setLinkOpen}>
        <PopoverTrigger asChild>
          <Toggle
            size="sm"
            pressed={editor.isActive("link")}
            aria-label="Link"
          >
            <Link2 className="h-3.5 w-3.5" />
          </Toggle>
        </PopoverTrigger>
        <PopoverContent className="w-72">
          <div className="flex flex-col gap-2">
            <label
              className="text-sm font-medium"
              htmlFor="bubble-link-url-input"
            >
              Link URL
            </label>
            <Input
              id="bubble-link-url-input"
              placeholder="https://example.com"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && insertLink()}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={insertLink}>
                Apply
              </Button>
              {editor.isActive("link") && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    editor.chain().focus().unsetLink().run();
                    setLinkOpen(false);
                  }}
                >
                  Remove
                </Button>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
