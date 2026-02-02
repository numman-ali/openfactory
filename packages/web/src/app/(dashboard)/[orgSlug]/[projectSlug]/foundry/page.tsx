// SPDX-License-Identifier: AGPL-3.0
"use client";

import { use } from "react";
import { FoundryEditor } from "@/modules/foundry";
import { useProjectContext } from "@/lib/hooks/useProjectContext";

export default function FoundryPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = use(params);
  const { projectId } = useProjectContext(orgSlug, projectSlug);

  return <FoundryEditor projectId={projectId} />;
}
