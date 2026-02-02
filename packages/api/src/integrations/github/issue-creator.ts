// SPDX-License-Identifier: AGPL-3.0-only

/**
 * GitHub Issues integration for creating issues from feedback.
 *
 * Creates issues with title, body, and labels derived from
 * Validator feedback items, including code context references
 * and suggested fixes.
 */

import type { GitHubAppConfig } from "./types.js";
import { getInstallationToken } from "./app.js";

const GITHUB_API_BASE = "https://api.github.com";

/** Input for creating a GitHub issue from feedback. */
export interface CreateIssueInput {
  owner: string;
  repo: string;
  installationId: number;
  title: string;
  feedbackSummary: string;
  category: "bug" | "feature_request" | "performance";
  codeReferences?: Array<{ file: string; line?: number; snippet?: string }>;
  suggestedFix?: string;
  feedbackItemId: string;
  feedbackItemUrl: string;
  labels?: string[];
}

/** Response after creating a GitHub issue. */
export interface CreateIssueResult {
  issueNumber: number;
  issueUrl: string;
  nodeId: string;
}

/** GitHub API response for issue creation. */
interface GitHubIssueResponse {
  number: number;
  html_url: string;
  node_id: string;
}

/**
 * Create a GitHub issue from a Validator feedback item.
 *
 * Builds a formatted issue body with feedback summary, code context
 * references, and a suggested fix, then creates the issue via the
 * GitHub API using the installation token.
 */
export async function createIssueFromFeedback(
  config: GitHubAppConfig,
  input: CreateIssueInput,
): Promise<CreateIssueResult> {
  const token = await getInstallationToken(config, input.installationId);
  const body = buildIssueBody(input);
  const labels = buildLabels(input);

  const response = await fetch(
    `${GITHUB_API_BASE}/repos/${input.owner}/${input.repo}/issues`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: input.title,
        body,
        labels,
      }),
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to create GitHub issue (${response.status}): ${errorBody}`);
  }

  const data = (await response.json()) as GitHubIssueResponse;
  return {
    issueNumber: data.number,
    issueUrl: data.html_url,
    nodeId: data.node_id,
  };
}

/** Build the Markdown issue body from the feedback input. */
function buildIssueBody(input: CreateIssueInput): string {
  const sections: string[] = [];

  sections.push(`## Feedback Summary\n\n${input.feedbackSummary}`);

  if (input.codeReferences && input.codeReferences.length > 0) {
    const refs = input.codeReferences.map((ref) => {
      const location = ref.line ? `${ref.file}:${ref.line}` : ref.file;
      if (ref.snippet) {
        return `- \`${location}\`\n  \`\`\`\n  ${ref.snippet}\n  \`\`\``;
      }
      return `- \`${location}\``;
    });
    sections.push(`## Code Context\n\n${refs.join("\n")}`);
  }

  if (input.suggestedFix) {
    sections.push(`## Suggested Fix\n\n${input.suggestedFix}`);
  }

  sections.push(
    `---\n\n*Created from [OpenFactory feedback](${input.feedbackItemUrl}) (ID: \`${input.feedbackItemId}\`)*`,
  );

  return sections.join("\n\n");
}

/** Build labels array from category and any explicit labels. */
function buildLabels(input: CreateIssueInput): string[] {
  const labels: string[] = [];

  switch (input.category) {
    case "bug":
      labels.push("bug");
      break;
    case "feature_request":
      labels.push("enhancement");
      break;
    case "performance":
      labels.push("performance");
      break;
  }

  labels.push("openfactory");

  if (input.labels) {
    for (const label of input.labels) {
      if (!labels.includes(label)) {
        labels.push(label);
      }
    }
  }

  return labels;
}
