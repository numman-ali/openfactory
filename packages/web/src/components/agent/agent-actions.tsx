// SPDX-License-Identifier: AGPL-3.0
"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface AgentActionConfig {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  variant?: "default" | "outline" | "secondary" | "ghost";
}

interface AgentActionsProps {
  actions: AgentActionConfig[];
  activeActionId?: string | null;
  isStreaming?: boolean;
  onActionClick: (actionId: string) => void;
  className?: string;
}

export function AgentActions({
  actions,
  activeActionId,
  isStreaming = false,
  onActionClick,
  className,
}: AgentActionsProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {actions.map((action) => {
        const isActive = activeActionId === action.id;
        return (
          <Button
            key={action.id}
            variant={action.variant ?? "outline"}
            size="sm"
            disabled={isStreaming}
            onClick={() => onActionClick(action.id)}
            className="gap-2"
          >
            {isActive && isStreaming ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              action.icon
            )}
            {action.label}
          </Button>
        );
      })}
    </div>
  );
}
