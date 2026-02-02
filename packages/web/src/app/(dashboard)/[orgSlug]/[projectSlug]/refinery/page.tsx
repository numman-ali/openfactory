// SPDX-License-Identifier: AGPL-3.0
"use client";

import { use } from "react";
import { RefineryEditor } from "@/modules/refinery";
import { useProjectContext } from "@/lib/hooks/useProjectContext";

export default function RefineryPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = use(params);
  const { projectId } = useProjectContext(orgSlug, projectSlug);

  return <RefineryEditor projectId={projectId} />;
}
