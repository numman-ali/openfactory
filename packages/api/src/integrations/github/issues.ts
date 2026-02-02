// SPDX-License-Identifier: AGPL-3.0-only

/**
 * GitHub Issues integration for OpenFactory.
 *
 * Creates GitHub issues from Validator feedback with labels,
 * code references, and suggested fixes.
 */

import { GitHubClient } from "./client.js";

export interface GitHubIssueInput {
  title: string;
  body: string;
  labels?: string[];
  assignees?: string[];
}

export interface GitHubIssueResult {
  id: number;
  number: number;
  url: string;
}

/**
 * Create a GitHub issue in the connected repository.
 */
export async function createGitHubIssue(
  installationToken: string,
  owner: string,
  repo: string,
  input: GitHubIssueInput,
): Promise<GitHubIssueResult> {
  void GitHubClient; // client available for future use

  const url = `https://api.github.com/repos/${owner}/${repo}/issues`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${installationToken}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({
      title: input.title,
      body: input.body,
      labels: input.labels ?? [],
      assignees: input.assignees ?? [],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`GitHub Issues API error ${response.status}: ${errText}`);
  }

  const data = (await response.json()) as {
    id: number;
    number: number;
    html_url: string;
  };

  return {
    id: data.id,
    number: data.number,
    url: data.html_url,
  };
}

/**
 * Build a GitHub issue body from Validator feedback.
 *
 * Includes categorization, code references, and suggested fixes
 * when available.
 */
export function buildFeedbackIssueBody(feedback: {
  description: string;
  category: string;
  browserInfo?: Record<string, unknown>;
  codeReferences?: Array<{ file: string; line?: number; context?: string }>;
  suggestedFix?: string;
}): string {
  const sections: string[] = [];

  sections.push("## Description");
  sections.push(feedback.description);

  sections.push(`\n## Category\n${feedback.category}`);

  if (feedback.browserInfo) {
    sections.push("\n## Environment");
    sections.push("```json");
    sections.push(JSON.stringify(feedback.browserInfo, null, 2));
    sections.push("```");
  }

  if (feedback.codeReferences && feedback.codeReferences.length > 0) {
    sections.push("\n## Code References");
    for (const ref of feedback.codeReferences) {
      const line = ref.line ? `#L${ref.line}` : "";
      sections.push(`- \`${ref.file}${line}\``);
      if (ref.context) {
        sections.push(`  > ${ref.context}`);
      }
    }
  }

  if (feedback.suggestedFix) {
    sections.push("\n## Suggested Fix");
    sections.push(feedback.suggestedFix);
  }

  sections.push("\n---");
  sections.push("*Created by OpenFactory Validator*");

  return sections.join("\n");
}
