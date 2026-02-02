// SPDX-License-Identifier: AGPL-3.0-only

/**
 * GitHub Issues creation from Validator feedback.
 *
 * Creates GitHub issues with labels, code references, and suggested fixes.
 */

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

export async function createGitHubIssue(
  installationToken: string,
  owner: string,
  repo: string,
  input: GitHubIssueInput,
): Promise<GitHubIssueResult> {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues`,
    {
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
    },
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`GitHub Issues API error ${response.status}: ${errText}`);
  }

  const data = (await response.json()) as {
    id: number;
    number: number;
    html_url: string;
  };

  return { id: data.id, number: data.number, url: data.html_url };
}

/**
 * Build a GitHub issue body from Validator feedback.
 */
export function buildFeedbackIssueBody(feedback: {
  description: string;
  category: string;
  browserInfo?: Record<string, unknown>;
  codeReferences?: Array<{ file: string; line?: number; context?: string }>;
  suggestedFix?: string;
}): string {
  const sections: string[] = [
    "## Description",
    feedback.description,
    `\n## Category\n${feedback.category}`,
  ];

  if (feedback.browserInfo) {
    sections.push("\n## Environment", "```json", JSON.stringify(feedback.browserInfo, null, 2), "```");
  }

  if (feedback.codeReferences && feedback.codeReferences.length > 0) {
    sections.push("\n## Code References");
    for (const ref of feedback.codeReferences) {
      const line = ref.line ? `#L${ref.line}` : "";
      sections.push(`- \`${ref.file}${line}\``);
      if (ref.context) sections.push(`  > ${ref.context}`);
    }
  }

  if (feedback.suggestedFix) {
    sections.push("\n## Suggested Fix", feedback.suggestedFix);
  }

  sections.push("\n---", "*Created by OpenFactory Validator*");
  return sections.join("\n");
}
