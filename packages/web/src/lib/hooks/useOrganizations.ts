// SPDX-License-Identifier: AGPL-3.0
"use client";

import useSWR from "swr";
import { useCallback } from "react";
import { api } from "@/lib/api-client";

interface OrgListItem {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  role: string;
  memberCount: number;
  projectCount: number;
}

interface OrgDetail {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  settings: Record<string, unknown>;
  createdAt: string;
}

interface OrgMember {
  id: string;
  userId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  joinedAt: string;
}

export function useOrganizations() {
  const { data, error, isLoading, mutate } = useSWR<{
    organizations: OrgListItem[];
  }>("/organizations");

  return {
    organizations: data?.organizations ?? [],
    isLoading,
    error,
    mutate,
  };
}

export function useOrganization(orgId: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<OrgDetail>(
    orgId ? `/organizations/${orgId}` : null
  );

  const updateOrg = useCallback(
    async (updates: { name?: string; logoUrl?: string | null; settings?: Record<string, unknown> }) => {
      if (!orgId) return;
      const result = await api.patch<OrgDetail>(`/organizations/${orgId}`, updates);
      await mutate(result);
      return result;
    },
    [orgId, mutate]
  );

  return {
    organization: data ?? null,
    isLoading,
    error,
    updateOrg,
    mutate,
  };
}

export function useOrgMembers(orgId: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<{
    members: OrgMember[];
  }>(orgId ? `/organizations/${orgId}/members` : null);

  const inviteMember = useCallback(
    async (email: string, role: "member" | "admin") => {
      if (!orgId) return;
      await api.post(`/organizations/${orgId}/members`, { email, role });
      await mutate();
    },
    [orgId, mutate]
  );

  const updateMemberRole = useCallback(
    async (memberId: string, role: "member" | "admin") => {
      if (!orgId) return;
      await api.patch(`/organizations/${orgId}/members/${memberId}`, { role });
      await mutate();
    },
    [orgId, mutate]
  );

  const removeMember = useCallback(
    async (memberId: string) => {
      if (!orgId) return;
      await api.delete(`/organizations/${orgId}/members/${memberId}`);
      await mutate();
    },
    [orgId, mutate]
  );

  return {
    members: data?.members ?? [],
    isLoading,
    error,
    inviteMember,
    updateMemberRole,
    removeMember,
    mutate,
  };
}
