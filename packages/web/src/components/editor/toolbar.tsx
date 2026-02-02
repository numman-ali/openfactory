// SPDX-License-Identifier: AGPL-3.0
"use client";

import * as React from "react";
import type { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Minus,
  Table,
  ImageIcon,
  Link2,
  Undo,
  Redo,
  Pilcrow,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Toggle } from "@/components/ui/toggle";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface EditorToolbarProps {
  editor: Editor;
  className?: string;
}

export function EditorToolbar({ editor, className }: EditorToolbarProps) {
  const [linkUrl, setLinkUrl] = React.useState("");
  const [imageUrl, setImageUrl] = React.useState("");
  const [linkOpen, setLinkOpen] = React.useState(false);
  const [imageOpen, setImageOpen] = React.useState(false);

  const currentBlockType = React.useMemo(() => {
    if (editor.isActive("heading", { level: 1 })) return "h1";
    if (editor.isActive("heading", { level: 2 })) return "h2";
    if (editor.isActive("heading", { level: 3 })) return "h3";
    if (editor.isActive("codeBlock")) return "code";
    if (editor.isActive("blockquote")) return "quote";
    return "paragraph";
  }, [
    // eslint-disable-next-line react-hooks/exhaustive-deps -- editor state changes trigger re-render
    editor.state.selection,
    editor,
  ]);

  function handleBlockTypeChange(value: string) {
    switch (value) {
      case "paragraph":
        editor.chain().focus().setParagraph().run();
        break;
      case "h1":
        editor.chain().focus().toggleHeading({ level: 1 }).run();
        break;
      case "h2":
        editor.chain().focus().toggleHeading({ level: 2 }).run();
        break;
      case "h3":
        editor.chain().focus().toggleHeading({ level: 3 }).run();
        break;
      case "code":
        editor.chain().focus().toggleCodeBlock().run();
        break;
      case "quote":
        editor.chain().focus().toggleBlockquote().run();
        break;
    }
  }

  function insertLink() {
    if (!linkUrl) return;
    editor.chain().focus().setLink({ href: linkUrl }).run();
    setLinkUrl("");
    setLinkOpen(false);
  }

  function insertImage() {
    if (!imageUrl) return;
    editor.chain().focus().setImage({ src: imageUrl }).run();
    setImageUrl("");
    setImageOpen(false);
  }

  function insertTable() {
    editor
      .chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-0.5 border-b px-2 py-1",
        className
      )}
      role="toolbar"
      aria-label="Editor formatting toolbar"
    >
      <Select value={currentBlockType} onValueChange={handleBlockTypeChange}>
        <SelectTrigger className="h-8 w-[130px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="paragraph">
            <span className="flex items-center gap-2">
              <Pilcrow className="h-3.5 w-3.5" /> Paragraph
            </span>
          </SelectItem>
          <SelectItem value="h1">
            <span className="flex items-center gap-2">
              <Heading1 className="h-3.5 w-3.5" /> Heading 1
            </span>
          </SelectItem>
          <SelectItem value="h2">
            <span className="flex items-center gap-2">
              <Heading2 className="h-3.5 w-3.5" /> Heading 2
            </span>
          </SelectItem>
          <SelectItem value="h3">
            <span className="flex items-center gap-2">
              <Heading3 className="h-3.5 w-3.5" /> Heading 3
            </span>
          </SelectItem>
          <SelectItem value="code">
            <span className="flex items-center gap-2">
              <Code className="h-3.5 w-3.5" /> Code Block
            </span>
          </SelectItem>
          <SelectItem value="quote">
            <span className="flex items-center gap-2">
              <Quote className="h-3.5 w-3.5" /> Blockquote
            </span>
          </SelectItem>
        </SelectContent>
      </Select>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <Toggle
        size="sm"
        pressed={editor.isActive("bold")}
        onPressedChange={() => editor.chain().focus().toggleBold().run()}
        aria-label="Bold"
      >
        <Bold className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("italic")}
        onPressedChange={() => editor.chain().focus().toggleItalic().run()}
        aria-label="Italic"
      >
        <Italic className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("strike")}
        onPressedChange={() => editor.chain().focus().toggleStrike().run()}
        aria-label="Strikethrough"
      >
        <Strikethrough className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("code")}
        onPressedChange={() => editor.chain().focus().toggleCode().run()}
        aria-label="Inline code"
      >
        <Code className="h-4 w-4" />
      </Toggle>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <Toggle
        size="sm"
        pressed={editor.isActive("bulletList")}
        onPressedChange={() =>
          editor.chain().focus().toggleBulletList().run()
        }
        aria-label="Bullet list"
      >
        <List className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("orderedList")}
        onPressedChange={() =>
          editor.chain().focus().toggleOrderedList().run()
        }
        aria-label="Ordered list"
      >
        <ListOrdered className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("taskList")}
        onPressedChange={() =>
          editor.chain().focus().toggleTaskList().run()
        }
        aria-label="Task list"
      >
        <ListChecks className="h-4 w-4" />
      </Toggle>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <Toggle
        size="sm"
        pressed={false}
        onPressedChange={insertTable}
        aria-label="Insert table"
      >
        <Table className="h-4 w-4" />
      </Toggle>

      <Popover open={imageOpen} onOpenChange={setImageOpen}>
        <PopoverTrigger asChild>
          <Toggle size="sm" pressed={false} aria-label="Insert image">
            <ImageIcon className="h-4 w-4" />
          </Toggle>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="image-url-input">
              Image URL
            </label>
            <Input
              id="image-url-input"
              placeholder="https://example.com/image.png"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && insertImage()}
            />
            <Button size="sm" onClick={insertImage}>
              Insert
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <Popover open={linkOpen} onOpenChange={setLinkOpen}>
        <PopoverTrigger asChild>
          <Toggle
            size="sm"
            pressed={editor.isActive("link")}
            aria-label="Insert link"
          >
            <Link2 className="h-4 w-4" />
          </Toggle>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="link-url-input">
              Link URL
            </label>
            <Input
              id="link-url-input"
              placeholder="https://example.com"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && insertLink()}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={insertLink}>
                Insert
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

      <Toggle
        size="sm"
        pressed={false}
        onPressedChange={() =>
          editor.chain().focus().setHorizontalRule().run()
        }
        aria-label="Horizontal rule"
      >
        <Minus className="h-4 w-4" />
      </Toggle>

      <div className="ml-auto flex items-center gap-0.5">
        <Toggle
          size="sm"
          pressed={false}
          onPressedChange={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          aria-label="Undo"
        >
          <Undo className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={false}
          onPressedChange={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          aria-label="Redo"
        >
          <Redo className="h-4 w-4" />
        </Toggle>
      </div>
    </div>
  );
}
