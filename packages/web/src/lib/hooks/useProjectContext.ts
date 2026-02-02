// SPDX-License-Identifier: AGPL-3.0
"use client";

import { useMemo } from "react";
import { useOrganizations } from "./useOrganizations";
import { useProjects } from "./useProjects";

/**
 * Resolves orgSlug + projectSlug from URL params into org/project IDs.
 * Used by all project-level pages to get the actual projectId for API calls.
 */
export function useProjectContext(orgSlug: string, projectSlug: string) {
  const { organizations, isLoading: orgsLoading } = useOrganizations();

  const org = useMemo(
    () => organizations.find((o) => o.slug === orgSlug),
    [organizations, orgSlug]
  );

  const { projects, isLoading: projsLoading } = useProjects(org?.id);

  const project = useMemo(
    () => projects.find((p) => p.slug === projectSlug),
    [projects, projectSlug]
  );

  return {
    orgId: org?.id,
    projectId: project?.id,
    orgName: org?.name,
    projectName: project?.name,
    isLoading: orgsLoading || projsLoading,
  };
}
