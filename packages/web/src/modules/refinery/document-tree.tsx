// SPDX-License-Identifier: AGPL-3.0
"use client";

import * as React from "react";
import { useState, useCallback } from "react";
import {
  FileText,
  Plus,
  Search,
  ChevronRight,
  ChevronDown,
  Upload,
  Download,
  GripVertical,
  Copy,
  Trash2,
  Pencil,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";

type DocType =
  | "product_overview"
  | "feature_requirements"
  | "technical_requirements";

export interface DocumentTreeItem {
  id: string;
  title: string;
  type: DocType;
  featureId: string | null;
  featureName: string | null;
  sortOrder: number;
  children?: DocumentTreeItem[];
}

interface DocumentTreeProps {
  documents: DocumentTreeItem[];
  selectedDocId: string | null;
  onSelectDocument: (id: string) => void;
  onNewFeature: () => void;
  onRename: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onReorder: (activeId: string, overId: string) => void;
  onImport: () => void;
  onExport: () => void;
  className?: string;
}

const DOC_TYPE_LABELS: Record<DocType, string> = {
  product_overview: "Product Overview",
  technical_requirements: "Technical Requirements",
  feature_requirements: "Feature Requirements",
};

interface SortableDocItemProps {
  doc: DocumentTreeItem;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onRename: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}

function SortableDocItem({
  doc,
  isSelected,
  onSelect,
  onRename,
  onDelete,
  onDuplicate,
}: SortableDocItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: doc.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={setNodeRef}
          style={style}
          className={cn(
            "group flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-sm transition-colors",
            isSelected
              ? "bg-accent text-accent-foreground"
              : "hover:bg-accent/50"
          )}
        >
          <button
            className="cursor-grab touch-none opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Drag to reorder"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-3 w-3 text-muted-foreground" />
          </button>
          <button
            onClick={() => onSelect(doc.id)}
            className="flex flex-1 items-center gap-2 min-w-0"
          >
            <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{doc.title}</span>
          </button>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => onRename(doc.id)}>
          <Pencil className="mr-2 h-3.5 w-3.5" />
          Rename
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onDuplicate(doc.id)}>
          <Copy className="mr-2 h-3.5 w-3.5" />
          Duplicate
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={() => onDelete(doc.id)}
          className="text-destructive"
        >
          <Trash2 className="mr-2 h-3.5 w-3.5" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

export function DocumentTree({
  documents,
  selectedDocId,
  onSelectDocument,
  onNewFeature,
  onRename,
  onDelete,
  onDuplicate,
  onReorder,
  onImport,
  onExport,
  className,
}: DocumentTreeProps) {
  const [search, setSearch] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<DocType>>(
    new Set(["product_overview", "technical_requirements", "feature_requirements"])
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const toggleSection = useCallback((type: DocType) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      onReorder(String(active.id), String(over.id));
    }
  }

  const filteredDocs = documents.filter((doc) =>
    doc.title.toLowerCase().includes(search.toLowerCase())
  );

  const groupedDocs = (Object.keys(DOC_TYPE_LABELS) as DocType[]).map(
    (type) => ({
      type,
      label: DOC_TYPE_LABELS[type],
      docs: filteredDocs.filter((d) => d.type === type),
    })
  );

  return (
    <div className={cn("flex w-64 flex-col border-r border-border", className)}>
      <div className="flex items-center justify-between p-3">
        <span className="text-sm font-semibold">Documents</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label="New document"
          onClick={onNewFeature}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search docs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-7 text-xs"
            aria-label="Search documents"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="space-y-1 px-2">
            {groupedDocs.map((group) => {
              const isExpanded = expandedSections.has(group.type);
              return (
                <div key={group.type}>
                  <button
                    onClick={() => toggleSection(group.type)}
                    className="flex w-full items-center gap-1 px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                    aria-expanded={isExpanded}
                    aria-label={`${group.label} section`}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                    {group.label}
                    <span className="ml-auto text-[10px] font-normal">
                      {group.docs.length}
                    </span>
                  </button>
                  {isExpanded && (
                    <SortableContext
                      items={group.docs.map((d) => d.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="ml-1 space-y-0.5">
                        {group.docs.map((doc) => (
                          <SortableDocItem
                            key={doc.id}
                            doc={doc}
                            isSelected={selectedDocId === doc.id}
                            onSelect={onSelectDocument}
                            onRename={onRename}
                            onDelete={onDelete}
                            onDuplicate={onDuplicate}
                          />
                        ))}
                        {group.docs.length === 0 && (
                          <p className="px-3 py-1 text-xs text-muted-foreground/60 italic">
                            No documents yet
                          </p>
                        )}
                      </div>
                    </SortableContext>
                  )}
                </div>
              );
            })}
          </div>
        </DndContext>
      </ScrollArea>

      <Separator />
      <div className="p-2 space-y-1">
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs"
          onClick={onNewFeature}
        >
          <Plus className="mr-1 h-3 w-3" /> New Feature
        </Button>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 text-xs"
            onClick={onImport}
          >
            <Upload className="mr-1 h-3 w-3" /> Import
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 text-xs"
            onClick={onExport}
          >
            <Download className="mr-1 h-3 w-3" /> Export
          </Button>
        </div>
      </div>
    </div>
  );
}
