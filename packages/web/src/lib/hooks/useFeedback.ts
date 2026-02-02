// SPDX-License-Identifier: AGPL-3.0
"use client";

import useSWR from "swr";
import { useCallback } from "react";
import { api } from "@/lib/api-client";

interface FeedbackListItem {
  id: string;
  title: string | null;
  description: string;
  category: string | null;
  priorityScore: number | null;
  status: string;
  tags: string[];
  browserInfo: Record<string, unknown> | null;
  externalUserId: string | null;
  generatedIssueUrl: string | null;
  createdAt: string;
}

interface FeedbackDetail extends FeedbackListItem {
  deviceInfo: Record<string, unknown> | null;
  sessionData: Record<string, unknown> | null;
  generatedIssueId: string | null;
  sourceAppKey: { id: string; name: string } | null;
  updatedAt: string;
}

interface FeedbackStats {
  totalCount: number;
  byCategory: Record<string, number>;
  byStatus: Record<string, number>;
  averagePriorityScore: number;
  topTags: string[];
  timeline: Array<Record<string, unknown>>;
}

export function useFeedback(
  projectId: string | undefined,
  filters?: {
    status?: string;
    category?: string;
    minPriority?: string;
  }
) {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.category) params.set("category", filters.category);
  if (filters?.minPriority) params.set("minPriority", filters.minPriority);
  const qs = params.toString();
  const key = projectId
    ? `/projects/${projectId}/validator/feedback${qs ? `?${qs}` : ""}`
    : null;

  const { data, error, isLoading, mutate } = useSWR<{
    feedbackItems: FeedbackListItem[];
    nextCursor: string | null;
    totalCount: number;
  }>(key);

  return {
    feedbackItems: data?.feedbackItems ?? [],
    totalCount: data?.totalCount ?? 0,
    nextCursor: data?.nextCursor ?? null,
    isLoading,
    error,
    mutate,
  };
}

export function useFeedbackItem(
  projectId: string | undefined,
  feedbackId: string | undefined
) {
  const { data, error, isLoading, mutate } = useSWR<FeedbackDetail>(
    projectId && feedbackId
      ? `/projects/${projectId}/validator/feedback/${feedbackId}`
      : null
  );

  const updateFeedback = useCallback(
    async (updates: {
      status?: string;
      category?: string;
      priorityScore?: number;
      tags?: string[];
    }) => {
      if (!projectId || !feedbackId) return;
      const result = await api.patch(
        `/projects/${projectId}/validator/feedback/${feedbackId}`,
        updates
      );
      await mutate();
      return result;
    },
    [projectId, feedbackId, mutate]
  );

  return {
    feedbackItem: data ?? null,
    isLoading,
    error,
    updateFeedback,
    mutate,
  };
}

export function useFeedbackStats(projectId: string | undefined) {
  const { data, error, isLoading } = useSWR<FeedbackStats>(
    projectId ? `/projects/${projectId}/validator/stats` : null
  );

  return {
    stats: data ?? null,
    isLoading,
    error,
  };
}
