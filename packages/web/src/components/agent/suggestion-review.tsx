// SPDX-License-Identifier: AGPL-3.0
"use client";

import * as React from "react";
import { Check, X, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

export type SuggestionAction = "create" | "update" | "delete" | "rename";

export interface SuggestionItem {
  id: string;
  action: SuggestionAction;
  entityType: string;
  entityName: string;
  description?: string;
  details?: string;
}

interface SuggestionReviewProps {
  title?: string;
  suggestions: SuggestionItem[];
  onAccept: (ids: string[]) => void;
  onReject: (ids: string[]) => void;
  className?: string;
}

const ACTION_BADGE_VARIANT: Record<SuggestionAction, "default" | "secondary" | "destructive" | "outline"> = {
  create: "default",
  update: "secondary",
  delete: "destructive",
  rename: "outline",
};

const ACTION_LABELS: Record<SuggestionAction, string> = {
  create: "Create",
  update: "Update",
  delete: "Delete",
  rename: "Rename",
};

export function SuggestionReview({
  title = "Proposed Changes",
  suggestions,
  onAccept,
  onReject,
  className,
}: SuggestionReviewProps) {
  const [selected, setSelected] = React.useState<Set<string>>(
    () => new Set(suggestions.map((s) => s.id))
  );
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === suggestions.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(suggestions.map((s) => s.id)));
    }
  }

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleAcceptSelected() {
    onAccept(Array.from(selected));
  }

  function handleRejectSelected() {
    onReject(Array.from(selected));
  }

  return (
    <div className={cn("rounded-md border bg-background", className)}>
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">{title}</h3>
          <Badge variant="secondary" className="text-xs">
            {suggestions.length}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleAll}
            className="text-xs"
          >
            {selected.size === suggestions.length
              ? "Deselect All"
              : "Select All"}
          </Button>
        </div>
      </div>

      <div className="divide-y">
        {suggestions.map((suggestion) => (
          <Collapsible
            key={suggestion.id}
            open={expandedIds.has(suggestion.id)}
            onOpenChange={() => toggleExpanded(suggestion.id)}
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <Checkbox
                checked={selected.has(suggestion.id)}
                onCheckedChange={() => toggleSelected(suggestion.id)}
                aria-label={`Select ${suggestion.entityName}`}
              />
              <CollapsibleTrigger className="flex flex-1 items-center gap-2">
                {expandedIds.has(suggestion.id) ? (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <Badge
                  variant={ACTION_BADGE_VARIANT[suggestion.action]}
                  className="text-xs"
                >
                  {ACTION_LABELS[suggestion.action]}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {suggestion.entityType}
                </span>
                <span className="text-sm font-medium">
                  {suggestion.entityName}
                </span>
              </CollapsibleTrigger>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onAccept([suggestion.id])}
                  aria-label={`Accept ${suggestion.entityName}`}
                >
                  <Check className="h-3.5 w-3.5 text-green-600" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onReject([suggestion.id])}
                  aria-label={`Reject ${suggestion.entityName}`}
                >
                  <X className="h-3.5 w-3.5 text-red-600" />
                </Button>
              </div>
            </div>
            <CollapsibleContent>
              <div className="border-t bg-muted/30 px-12 py-3">
                {suggestion.description && (
                  <p className="text-sm text-muted-foreground">
                    {suggestion.description}
                  </p>
                )}
                {suggestion.details && (
                  <pre className="mt-2 whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">
                    {suggestion.details}
                  </pre>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>

      <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
        <Button
          variant="outline"
          size="sm"
          onClick={handleRejectSelected}
          disabled={selected.size === 0}
        >
          <X className="mr-1.5 h-3.5 w-3.5" />
          Reject ({selected.size})
        </Button>
        <Button
          size="sm"
          onClick={handleAcceptSelected}
          disabled={selected.size === 0}
        >
          <Check className="mr-1.5 h-3.5 w-3.5" />
          Accept ({selected.size})
        </Button>
      </div>
    </div>
  );
}
