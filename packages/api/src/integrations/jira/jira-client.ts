// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Jira REST API client for creating issues from Validator feedback.
 *
 * Connects to Jira Cloud using basic auth (email + API token),
 * maps feedback categories to Jira issue types, and includes
 * code context and suggested fixes in the issue description.
 */

/** Jira connection configuration loaded from environment variables. */
export interface JiraConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
  projectKey: string;
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

  if (!baseUrl || !email || !apiToken || !projectKey) {
    return null;
  }

  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    email,
    apiToken,
    projectKey,
  };
}

/** Map feedback categories to Jira issue type names. */
const CATEGORY_TO_ISSUE_TYPE: Record<string, string> = {
  bug: "Bug",
  feature_request: "Story",
  performance: "Task",
};

/** Input for creating a Jira issue from feedback. */
export interface CreateJiraIssueInput {
  title: string;
  feedbackSummary: string;
  category: "bug" | "feature_request" | "performance";
  codeReferences?: Array<{ file: string; line?: number; snippet?: string }>;
  suggestedFix?: string;
  feedbackItemId: string;
  feedbackItemUrl: string;
  labels?: string[];
  projectKey?: string;
}

/** Response after creating a Jira issue. */
export interface CreateJiraIssueResult {
  issueKey: string;
  issueUrl: string;
  issueId: string;
}

/** Jira API response for issue creation. */
interface JiraCreateIssueResponse {
  id: string;
  key: string;
  self: string;
}

/**
 * Create a Jira issue from a Validator feedback item.
 *
 * Maps the feedback category to a Jira issue type, builds an
 * Atlassian Document Format (ADF) description, and creates the
 * issue via the Jira REST API v3.
 */
export async function createJiraIssue(
  config: JiraConfig,
  input: CreateJiraIssueInput,
): Promise<CreateJiraIssueResult> {
  const projectKey = input.projectKey ?? config.projectKey;
  const issueType = CATEGORY_TO_ISSUE_TYPE[input.category] ?? "Task";
  const description = buildAdfDescription(input);

  const authHeader =
    "Basic " + Buffer.from(`${config.email}:${config.apiToken}`).toString("base64");

  const response = await fetch(`${config.baseUrl}/rest/api/3/issue`, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fields: {
        project: { key: projectKey },
        summary: input.title,
        issuetype: { name: issueType },
        description,
        labels: [
          "openfactory",
          ...(input.labels ?? []),
        ],
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to create Jira issue (${response.status}): ${errorBody}`);
  }

  const data = (await response.json()) as JiraCreateIssueResponse;
  return {
    issueKey: data.key,
    issueUrl: `${config.baseUrl}/browse/${data.key}`,
    issueId: data.id,
  };
}

/**
 * Build an Atlassian Document Format (ADF) description.
 *
 * ADF is the structured document format used by Jira Cloud REST API v3.
 * We build a document with paragraphs, headings, and code blocks.
 */
function buildAdfDescription(input: CreateJiraIssueInput): object {
  const content: object[] = [];

  // Feedback summary heading + paragraph
  content.push(adfHeading("Feedback Summary"));
  content.push(adfParagraph(input.feedbackSummary));

  // Code references
  if (input.codeReferences && input.codeReferences.length > 0) {
    content.push(adfHeading("Code Context"));
    for (const ref of input.codeReferences) {
      const location = ref.line ? `${ref.file}:${ref.line}` : ref.file;
      content.push(adfParagraph(location));
      if (ref.snippet) {
        content.push(adfCodeBlock(ref.snippet));
      }
    }
  }

  // Suggested fix
  if (input.suggestedFix) {
    content.push(adfHeading("Suggested Fix"));
    content.push(adfParagraph(input.suggestedFix));
  }

  // Link back to OpenFactory
  content.push(adfHorizontalRule());
  content.push(
    adfParagraph(
      `Created from OpenFactory feedback (ID: ${input.feedbackItemId}): ${input.feedbackItemUrl}`,
    ),
  );

  return {
    type: "doc",
    version: 1,
    content,
  };
}

function adfHeading(text: string): object {
  return {
    type: "heading",
    attrs: { level: 3 },
    content: [{ type: "text", text }],
  };
}

function adfParagraph(text: string): object {
  return {
    type: "paragraph",
    content: [{ type: "text", text }],
  };
}

function adfCodeBlock(code: string): object {
  return {
    type: "codeBlock",
    attrs: { language: "typescript" },
    content: [{ type: "text", text: code }],
  };
}

function adfHorizontalRule(): object {
  return { type: "rule" };
}
