// SPDX-License-Identifier: AGPL-3.0
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronUp, ChevronDown } from "lucide-react";

export interface DiffLine {
  type: "added" | "removed" | "unchanged";
  content: string;
  oldLineNumber: number | null;
  newLineNumber: number | null;
}

export interface DiffBlock {
  lines: DiffLine[];
}

interface DiffViewerProps {
  blocks: DiffBlock[];
  className?: string;
}

export function DiffViewer({ blocks, className }: DiffViewerProps) {
  const [currentChangeIndex, setCurrentChangeIndex] = React.useState(0);
  const changeRefs = React.useRef<(HTMLTableRowElement | null)[]>([]);

  const changedLineIndices = React.useMemo(() => {
    const indices: number[] = [];
    let lineIdx = 0;
    for (const block of blocks) {
      for (const line of block.lines) {
        if (line.type !== "unchanged") {
          indices.push(lineIdx);
        }
        lineIdx++;
      }
    }
    return indices;
  }, [blocks]);

  function navigateChange(direction: "prev" | "next") {
    const nextIndex =
      direction === "next"
        ? Math.min(currentChangeIndex + 1, changedLineIndices.length - 1)
        : Math.max(currentChangeIndex - 1, 0);
    setCurrentChangeIndex(nextIndex);
    changeRefs.current[changedLineIndices[nextIndex]]?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }

  function renderInlineView() {
    let lineIdx = 0;
    return (
      <table className="w-full font-mono text-sm">
        <tbody>
          {blocks.map((block, blockIdx) =>
            block.lines.map((line) => {
              const idx = lineIdx++;
              return (
                <tr
                  key={`${blockIdx}-${idx}`}
                  ref={(el) => {
                    changeRefs.current[idx] = el;
                  }}
                  className={cn(
                    line.type === "added" &&
                      "bg-green-50 dark:bg-green-950/30",
                    line.type === "removed" &&
                      "bg-red-50 dark:bg-red-950/30"
                  )}
                >
                  <td className="w-12 select-none pr-2 text-right text-muted-foreground">
                    {line.oldLineNumber ?? ""}
                  </td>
                  <td className="w-12 select-none pr-2 text-right text-muted-foreground">
                    {line.newLineNumber ?? ""}
                  </td>
                  <td className="w-4 select-none text-center">
                    {line.type === "added" && (
                      <span className="text-green-600">+</span>
                    )}
                    {line.type === "removed" && (
                      <span className="text-red-600">-</span>
                    )}
                  </td>
                  <td className="whitespace-pre-wrap break-all pl-2">
                    {line.content}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    );
  }

  function renderSideBySideView() {
    const leftLines: DiffLine[] = [];
    const rightLines: DiffLine[] = [];

    for (const block of blocks) {
      for (const line of block.lines) {
        if (line.type === "unchanged") {
          leftLines.push(line);
          rightLines.push(line);
        } else if (line.type === "removed") {
          leftLines.push(line);
          rightLines.push({
            type: "unchanged",
            content: "",
            oldLineNumber: null,
            newLineNumber: null,
          });
        } else {
          leftLines.push({
            type: "unchanged",
            content: "",
            oldLineNumber: null,
            newLineNumber: null,
          });
          rightLines.push(line);
        }
      }
    }

    return (
      <div className="grid grid-cols-2 divide-x">
        <table className="w-full font-mono text-sm">
          <tbody>
            {leftLines.map((line, idx) => (
              <tr
                key={idx}
                className={cn(
                  line.type === "removed" &&
                    "bg-red-50 dark:bg-red-950/30"
                )}
              >
                <td className="w-12 select-none pr-2 text-right text-muted-foreground">
                  {line.oldLineNumber ?? ""}
                </td>
                <td className="whitespace-pre-wrap break-all pl-2">
                  {line.content}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <table className="w-full font-mono text-sm">
          <tbody>
            {rightLines.map((line, idx) => (
              <tr
                key={idx}
                className={cn(
                  line.type === "added" &&
                    "bg-green-50 dark:bg-green-950/30"
                )}
              >
                <td className="w-12 select-none pr-2 text-right text-muted-foreground">
                  {line.newLineNumber ?? ""}
                </td>
                <td className="whitespace-pre-wrap break-all pl-2">
                  {line.content}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className={cn("rounded-md border bg-background", className)}>
      <div className="flex items-center justify-between border-b px-4 py-2">
        <span className="text-sm text-muted-foreground">
          {changedLineIndices.length} change
          {changedLineIndices.length !== 1 ? "s" : ""}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigateChange("prev")}
            disabled={currentChangeIndex === 0}
            aria-label="Previous change"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground">
            {changedLineIndices.length > 0 ? currentChangeIndex + 1 : 0} /{" "}
            {changedLineIndices.length}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigateChange("next")}
            disabled={
              currentChangeIndex >= changedLineIndices.length - 1
            }
            aria-label="Next change"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <Tabs defaultValue="inline">
        <div className="border-b px-4">
          <TabsList className="h-8">
            <TabsTrigger value="inline" className="text-xs">
              Inline
            </TabsTrigger>
            <TabsTrigger value="side-by-side" className="text-xs">
              Side by Side
            </TabsTrigger>
          </TabsList>
        </div>
        <div className="overflow-auto">
          <TabsContent value="inline" className="m-0">
            {renderInlineView()}
          </TabsContent>
          <TabsContent value="side-by-side" className="m-0">
            {renderSideBySideView()}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
