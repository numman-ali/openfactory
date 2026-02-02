// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Jira integration for OpenFactory.
 *
 * Creates Jira issues from Validator feedback with proper issue types,
 * components, labels, and priority mapping.
 */

export interface JiraConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
  projectKey: string;
}

export interface JiraIssueInput {
  summary: string;
  description: string;
  issueType: "Bug" | "Story" | "Task";
  labels?: string[];
  components?: string[];
  priority?: "Highest" | "High" | "Medium" | "Low" | "Lowest";
}

export interface JiraIssueResult {
  id: string;
  key: string;
  url: string;
}

/**
 * Load Jira configuration from environment variables.
 * Returns null if the required variables are not set (Jira integration is optional).
 */
export function loadJiraConfig(): JiraConfig | null {
  const baseUrl = process.env.JIRA_BASE_URL;
  const email = process.env.JIRA_EMAIL;
  const apiToken = process.env.JIRA_API_TOKEN;
  const projectKey = process.env.JIRA_PROJECT_KEY;

  if (!baseUrl || !email || !apiToken || !projectKey) return null;
  return { baseUrl, email, apiToken, projectKey };
}

/**
 * Create a Jira issue via REST API v3.
 */
export async function createJiraIssue(
  config: JiraConfig,
  input: JiraIssueInput,
): Promise<JiraIssueResult> {
  const auth = Buffer.from(`${config.email}:${config.apiToken}`).toString("base64");

  const body = {
    fields: {
      project: { key: config.projectKey },
      summary: input.summary,
      description: {
        type: "doc",
        version: 1,
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: input.description }],
          },
        ],
      },
      issuetype: { name: input.issueType },
      ...(input.labels && { labels: input.labels }),
      ...(input.priority && { priority: { name: input.priority } }),
      ...(input.components && {
        components: input.components.map((name) => ({ name })),
      }),
    },
  };

  const response = await fetch(`${config.baseUrl}/rest/api/3/issue`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new JiraApiError(response.status, errText);
  }

  const data = (await response.json()) as { id: string; key: string };
  return {
    id: data.id,
    key: data.key,
    url: `${config.baseUrl}/browse/${data.key}`,
  };
}

export class JiraApiError extends Error {
  constructor(
    public status: number,
    public body: string,
  ) {
    super(`Jira API error ${status}: ${body}`);
    this.name = "JiraApiError";
  }
}
