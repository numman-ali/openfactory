// SPDX-License-Identifier: AGPL-3.0
"use client";

import useSWR from "swr";
import { useCallback } from "react";
import { api } from "@/lib/api-client";

interface DocumentListItem {
  id: string;
  type: string;
  title: string;
  slug: string;
  featureId: string | null;
  featureName: string | null;
  sortOrder: number;
  createdBy: { id: string; name: string } | null;
  updatedAt: string;
  createdAt: string;
}

interface DocumentDetail extends DocumentListItem {
  content: Record<string, unknown> | null;
  diagramSource?: string | null;
}

export function useRefineryDocuments(
  projectId: string | undefined,
  filters?: { type?: string; featureId?: string }
) {
  const params = new URLSearchParams();
  if (filters?.type) params.set("type", filters.type);
  if (filters?.featureId) params.set("featureId", filters.featureId);
  const qs = params.toString();
  const key = projectId
    ? `/projects/${projectId}/refinery/documents${qs ? `?${qs}` : ""}`
    : null;

  const { data, error, isLoading, mutate } = useSWR<{
    documents: DocumentListItem[];
  }>(key);

  const createDocument = useCallback(
    async (input: {
      type: string;
      title: string;
      featureId?: string;
      content?: Record<string, unknown>;
    }) => {
      if (!projectId) return;
      const result = await api.post(
        `/projects/${projectId}/refinery/documents`,
        input
      );
      await mutate();
      return result;
    },
    [projectId, mutate]
  );

  return {
    documents: data?.documents ?? [],
    isLoading,
    error,
    createDocument,
    mutate,
  };
}

export function useRefineryDocument(
  projectId: string | undefined,
  documentId: string | undefined
) {
  const { data, error, isLoading, mutate } = useSWR<DocumentDetail>(
    projectId && documentId
      ? `/projects/${projectId}/refinery/documents/${documentId}`
      : null
  );

  const updateDocument = useCallback(
    async (updates: { title?: string; sortOrder?: number }) => {
      if (!projectId || !documentId) return;
      const result = await api.patch<DocumentDetail>(
        `/projects/${projectId}/refinery/documents/${documentId}`,
        updates
      );
      await mutate(result);
      return result;
    },
    [projectId, documentId, mutate]
  );

  const deleteDocument = useCallback(async () => {
    if (!projectId || !documentId) return;
    await api.delete(`/projects/${projectId}/refinery/documents/${documentId}`);
    await mutate(undefined, { revalidate: false });
  }, [projectId, documentId, mutate]);

  return {
    document: data ?? null,
    isLoading,
    error,
    updateDocument,
    deleteDocument,
    mutate,
  };
}

export function useFoundryBlueprints(
  projectId: string | undefined,
  filters?: { type?: string; featureId?: string }
) {
  const params = new URLSearchParams();
  if (filters?.type) params.set("type", filters.type);
  if (filters?.featureId) params.set("featureId", filters.featureId);
  const qs = params.toString();
  const key = projectId
    ? `/projects/${projectId}/foundry/blueprints${qs ? `?${qs}` : ""}`
    : null;

  const { data, error, isLoading, mutate } = useSWR<{
    blueprints: DocumentListItem[];
  }>(key);

  const createBlueprint = useCallback(
    async (input: {
      type: string;
      title: string;
      featureId?: string;
      content?: Record<string, unknown>;
      diagramSource?: string;
    }) => {
      if (!projectId) return;
      const result = await api.post(
        `/projects/${projectId}/foundry/blueprints`,
        input
      );
      await mutate();
      return result;
    },
    [projectId, mutate]
  );

  return {
    blueprints: data?.blueprints ?? [],
    isLoading,
    error,
    createBlueprint,
    mutate,
  };
}

export function useFoundryBlueprint(
  projectId: string | undefined,
  blueprintId: string | undefined
) {
  const { data, error, isLoading, mutate } = useSWR<DocumentDetail>(
    projectId && blueprintId
      ? `/projects/${projectId}/foundry/blueprints/${blueprintId}`
      : null
  );

  const updateBlueprint = useCallback(
    async (updates: {
      title?: string;
      sortOrder?: number;
      diagramSource?: string;
    }) => {
      if (!projectId || !blueprintId) return;
      const result = await api.patch<DocumentDetail>(
        `/projects/${projectId}/foundry/blueprints/${blueprintId}`,
        updates
      );
      await mutate(result);
      return result;
    },
    [projectId, blueprintId, mutate]
  );

  const deleteBlueprint = useCallback(async () => {
    if (!projectId || !blueprintId) return;
    await api.delete(
      `/projects/${projectId}/foundry/blueprints/${blueprintId}`
    );
    await mutate(undefined, { revalidate: false });
  }, [projectId, blueprintId, mutate]);

  return {
    blueprint: data ?? null,
    isLoading,
    error,
    updateBlueprint,
    deleteBlueprint,
    mutate,
  };
}
