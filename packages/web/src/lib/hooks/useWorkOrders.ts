// SPDX-License-Identifier: AGPL-3.0
"use client";

import useSWR from "swr";
import { useCallback } from "react";
import { api } from "@/lib/api-client";

interface WorkOrderListItem {
  id: string;
  title: string;
  status: string;
  phase: { id: string; name: string } | null;
  feature: { id: string; name: string } | null;
  assignees: Array<{ id: string; name: string }>;
  deliverableType: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface WorkOrderDetail extends WorkOrderListItem {
  description: Record<string, unknown> | null;
  acceptanceCriteria: Record<string, unknown> | null;
  outOfScope: Record<string, unknown> | null;
  implementationPlan: Record<string, unknown> | null;
  graphConnections: Array<Record<string, unknown>>;
  createdBy: { id: string; name: string } | null;
}

interface PhaseListItem {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  workOrderCount: number;
  createdAt: string;
}

export function usePhases(projectId: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<{
    phases: PhaseListItem[];
  }>(projectId ? `/projects/${projectId}/planner/phases` : null);

  const createPhase = useCallback(
    async (name: string, description?: string) => {
      if (!projectId) return;
      const result = await api.post(
        `/projects/${projectId}/planner/phases`,
        { name, description }
      );
      await mutate();
      return result;
    },
    [projectId, mutate]
  );

  return {
    phases: data?.phases ?? [],
    isLoading,
    error,
    createPhase,
    mutate,
  };
}

export function useWorkOrders(
  projectId: string | undefined,
  filters?: {
    status?: string;
    phaseId?: string;
    featureId?: string;
    deliverableType?: string;
  }
) {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.phaseId) params.set("phaseId", filters.phaseId);
  if (filters?.featureId) params.set("featureId", filters.featureId);
  if (filters?.deliverableType) params.set("deliverableType", filters.deliverableType);
  const qs = params.toString();
  const key = projectId
    ? `/projects/${projectId}/planner/work-orders${qs ? `?${qs}` : ""}`
    : null;

  const { data, error, isLoading, mutate } = useSWR<{
    workOrders: WorkOrderListItem[];
    nextCursor: string | null;
    totalCount: number;
  }>(key);

  const createWorkOrder = useCallback(
    async (input: {
      title: string;
      phaseId?: string;
      featureId?: string;
      status?: string;
      description?: Record<string, unknown>;
      assigneeIds?: string[];
      deliverableType?: string;
    }) => {
      if (!projectId) return;
      const result = await api.post(
        `/projects/${projectId}/planner/work-orders`,
        input
      );
      await mutate();
      return result;
    },
    [projectId, mutate]
  );

  return {
    workOrders: data?.workOrders ?? [],
    totalCount: data?.totalCount ?? 0,
    nextCursor: data?.nextCursor ?? null,
    isLoading,
    error,
    createWorkOrder,
    mutate,
  };
}

export function useWorkOrder(
  projectId: string | undefined,
  workOrderId: string | undefined
) {
  const { data, error, isLoading, mutate } = useSWR<WorkOrderDetail>(
    projectId && workOrderId
      ? `/projects/${projectId}/planner/work-orders/${workOrderId}`
      : null
  );

  const updateWorkOrder = useCallback(
    async (updates: Record<string, unknown>) => {
      if (!projectId || !workOrderId) return;
      const result = await api.patch(
        `/projects/${projectId}/planner/work-orders/${workOrderId}`,
        updates
      );
      await mutate();
      return result;
    },
    [projectId, workOrderId, mutate]
  );

  const deleteWorkOrder = useCallback(async () => {
    if (!projectId || !workOrderId) return;
    await api.delete(
      `/projects/${projectId}/planner/work-orders/${workOrderId}`
    );
    await mutate(undefined, { revalidate: false });
  }, [projectId, workOrderId, mutate]);

  return {
    workOrder: data ?? null,
    isLoading,
    error,
    updateWorkOrder,
    deleteWorkOrder,
    mutate,
  };
}
