// SPDX-License-Identifier: AGPL-3.0
"use client";

import * as React from "react";
import { useState, useCallback } from "react";
import {
  FileCode,
  Plus,
  Search,
  ChevronRight,
  ChevronDown,
  GripVertical,
  Copy,
  Trash2,
  Pencil,
  Layout,
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

type BlueprintType =
  | "foundation_blueprint"
  | "system_diagram"
  | "feature_blueprint";

export interface BlueprintTreeItem {
  id: string;
  title: string;
  type: BlueprintType;
  featureId: string | null;
  featureName: string | null;
  sortOrder: number;
  children?: BlueprintTreeItem[];
}

interface BlueprintTreeProps {
  blueprints: BlueprintTreeItem[];
  selectedBlueprintId: string | null;
  onSelectBlueprint: (id: string) => void;
  onNewBlueprint: () => void;
  onRename: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onReorder: (activeId: string, overId: string) => void;
  onInitializeTemplate: () => void;
  className?: string;
}

const TYPE_LABELS: Record<BlueprintType, string> = {
  foundation_blueprint: "Foundations",
  system_diagram: "System Diagrams",
  feature_blueprint: "Feature Blueprints",
};

interface SortableBlueprintItemProps {
  item: BlueprintTreeItem;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onRename: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}

function SortableBlueprintItem({
  item,
  isSelected,
  onSelect,
  onRename,
  onDelete,
  onDuplicate,
}: SortableBlueprintItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

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
            onClick={() => onSelect(item.id)}
            className="flex flex-1 items-center gap-2 min-w-0"
          >
            <FileCode className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{item.title}</span>
          </button>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => onRename(item.id)}>
          <Pencil className="mr-2 h-3.5 w-3.5" />
          Rename
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onDuplicate(item.id)}>
          <Copy className="mr-2 h-3.5 w-3.5" />
          Duplicate
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={() => onDelete(item.id)}
          className="text-destructive"
        >
          <Trash2 className="mr-2 h-3.5 w-3.5" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

export function BlueprintTree({
  blueprints,
  selectedBlueprintId,
  onSelectBlueprint,
  onNewBlueprint,
  onRename,
  onDelete,
  onDuplicate,
  onReorder,
  onInitializeTemplate,
  className,
}: BlueprintTreeProps) {
  const [search, setSearch] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<BlueprintType>>(
    new Set(["foundation_blueprint", "system_diagram", "feature_blueprint"])
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const toggleSection = useCallback((type: BlueprintType) => {
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

  const filteredBlueprints = blueprints.filter((bp) =>
    bp.title.toLowerCase().includes(search.toLowerCase())
  );

  const groupedBlueprints = (Object.keys(TYPE_LABELS) as BlueprintType[]).map(
    (type) => ({
      type,
      label: TYPE_LABELS[type],
      items: filteredBlueprints.filter((b) => b.type === type),
    })
  );

  return (
    <div className={cn("flex w-64 flex-col border-r border-border", className)}>
      <div className="flex items-center justify-between p-3">
        <span className="text-sm font-semibold">Blueprints</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label="New blueprint"
          onClick={onNewBlueprint}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search blueprints..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-7 text-xs"
            aria-label="Search blueprints"
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
            {groupedBlueprints.map((group) => {
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
                      {group.items.length}
                    </span>
                  </button>
                  {isExpanded && (
                    <SortableContext
                      items={group.items.map((b) => b.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="ml-1 space-y-0.5">
                        {group.items.map((bp) => (
                          <SortableBlueprintItem
                            key={bp.id}
                            item={bp}
                            isSelected={selectedBlueprintId === bp.id}
                            onSelect={onSelectBlueprint}
                            onRename={onRename}
                            onDelete={onDelete}
                            onDuplicate={onDuplicate}
                          />
                        ))}
                        {group.items.length === 0 && (
                          <p className="px-3 py-1 text-xs text-muted-foreground/60 italic">
                            No blueprints yet
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
      <div className="p-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs"
          onClick={onInitializeTemplate}
        >
          <Layout className="mr-1 h-3 w-3" /> Initialize from Template
        </Button>
      </div>
    </div>
  );
}
