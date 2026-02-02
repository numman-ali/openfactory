// SPDX-License-Identifier: AGPL-3.0
"use client";

import useSWR from "swr";
import { useCallback } from "react";
import { api } from "@/lib/api-client";

interface ProjectListItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  archivedAt: string | null;
  featureCount: number;
  documentCount: number;
  workOrderCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ProjectDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  organizationId: string;
  settings: Record<string, unknown>;
  stats: {
    featureCount: number;
    documentCount: number;
    workOrderCount: number;
    artifactCount: number;
    hasCodebaseConnection: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export function useProjects(orgId: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<{
    projects: ProjectListItem[];
  }>(orgId ? `/organizations/${orgId}/projects` : null);

  const createProject = useCallback(
    async (name: string, description?: string) => {
      if (!orgId) return;
      const result = await api.post(`/organizations/${orgId}/projects`, {
        name,
        description,
      });
      await mutate();
      return result;
    },
    [orgId, mutate]
  );

  return {
    projects: data?.projects ?? [],
    isLoading,
    error,
    createProject,
    mutate,
  };
}

export function useProject(projectId: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<ProjectDetail>(
    projectId ? `/projects/${projectId}` : null
  );

  const updateProject = useCallback(
    async (updates: { name?: string; description?: string; settings?: Record<string, unknown> }) => {
      if (!projectId) return;
      const result = await api.patch<ProjectDetail>(
        `/projects/${projectId}`,
        updates
      );
      await mutate(result);
      return result;
    },
    [projectId, mutate]
  );

  const archiveProject = useCallback(async () => {
    if (!projectId) return;
    await api.post(`/projects/${projectId}/archive`);
    await mutate();
  }, [projectId, mutate]);

  return {
    project: data ?? null,
    isLoading,
    error,
    updateProject,
    archiveProject,
    mutate,
  };
}
