// SPDX-License-Identifier: AGPL-3.0
"use client";

import useSWR from "swr";
import { useCallback } from "react";
import { api } from "@/lib/api-client";

interface GraphNodeItem {
  id: string;
  entityType: string;
  entityId: string;
  label: string;
  metadata: Record<string, unknown>;
  contentHash: string | null;
  lastSyncedAt: string | null;
  edgeCount: number;
}

interface GraphEdgeItem {
  id: string;
  edgeType: string;
  sourceNode: { id: string; entityType: string; label: string };
  targetNode: { id: string; entityType: string; label: string };
  metadata: Record<string, unknown>;
  createdAt: string;
}

interface DriftAlertItem {
  id: string;
  driftType: string;
  description: string;
  severity: string;
  status: string;
  sourceNode: { id: string; entityType: string; label: string };
  targetNode: { id: string; entityType: string; label: string } | null;
  createdAt: string;
  updatedAt: string;
}

export function useGraphNodes(
  projectId: string | undefined,
  filters?: { entityType?: string; search?: string }
) {
  const params = new URLSearchParams();
  if (filters?.entityType) params.set("entityType", filters.entityType);
  if (filters?.search) params.set("search", filters.search);
  const qs = params.toString();
  const key = projectId
    ? `/projects/${projectId}/graph/nodes${qs ? `?${qs}` : ""}`
    : null;

  const { data, error, isLoading, mutate } = useSWR<{
    nodes: GraphNodeItem[];
  }>(key);

  return {
    nodes: data?.nodes ?? [],
    isLoading,
    error,
    mutate,
  };
}

export function useGraphEdges(
  projectId: string | undefined,
  filters?: { edgeType?: string; sourceNodeId?: string; targetNodeId?: string }
) {
  const params = new URLSearchParams();
  if (filters?.edgeType) params.set("edgeType", filters.edgeType);
  if (filters?.sourceNodeId) params.set("sourceNodeId", filters.sourceNodeId);
  if (filters?.targetNodeId) params.set("targetNodeId", filters.targetNodeId);
  const qs = params.toString();
  const key = projectId
    ? `/projects/${projectId}/graph/edges${qs ? `?${qs}` : ""}`
    : null;

  const { data, error, isLoading } = useSWR<{
    edges: GraphEdgeItem[];
  }>(key);

  return {
    edges: data?.edges ?? [],
    isLoading,
    error,
  };
}

export function useDriftAlerts(
  projectId: string | undefined,
  filters?: { status?: string; driftType?: string; severity?: string }
) {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.driftType) params.set("driftType", filters.driftType);
  if (filters?.severity) params.set("severity", filters.severity);
  const qs = params.toString();
  const key = projectId
    ? `/projects/${projectId}/graph/drift-alerts${qs ? `?${qs}` : ""}`
    : null;

  const { data, error, isLoading, mutate } = useSWR<{
    alerts: DriftAlertItem[];
    nextCursor: string | null;
  }>(key);

  const updateAlert = useCallback(
    async (alertId: string, status: "acknowledged" | "resolved" | "dismissed") => {
      if (!projectId) return;
      const result = await api.patch(
        `/projects/${projectId}/graph/drift-alerts/${alertId}`,
        { status }
      );
      await mutate();
      return result;
    },
    [projectId, mutate]
  );

  return {
    alerts: data?.alerts ?? [],
    nextCursor: data?.nextCursor ?? null,
    isLoading,
    error,
    updateAlert,
    mutate,
  };
}
