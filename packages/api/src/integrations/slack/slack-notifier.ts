// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Slack webhook integration for sending formatted notifications.
 *
 * Supports message templates for critical feedback alerts, drift
 * detection, and work order status changes. Includes per-project
 * webhook configuration and rate limiting.
 */

/** Slack notification configuration for a project. */
export interface SlackConfig {
  webhookUrl: string;
  projectId: string;
  projectName: string;
}

/** Rate limiter state per project. */
interface RateLimitEntry {
  count: number;
  windowStart: number;
}

/** Maximum messages per minute per project. */
const MAX_MESSAGES_PER_MINUTE = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

const rateLimitMap = new Map<string, RateLimitEntry>();

/** Check and update rate limit for a project. Returns true if allowed. */
function checkRateLimit(projectId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(projectId);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(projectId, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= MAX_MESSAGES_PER_MINUTE) {
    return false;
  }

  entry.count++;
  return true;
}

/** Base interface for all Slack notification payloads. */
interface SlackBlock {
  type: string;
  text?: { type: string; text: string; emoji?: boolean };
  elements?: Array<{ type: string; text?: { type: string; text: string }; url?: string }>;
  fields?: Array<{ type: string; text: string }>;
}

/** Build a Slack message payload from blocks. */
function buildPayload(text: string, blocks: SlackBlock[]): string {
  return JSON.stringify({ text, blocks });
}

/**
 * Send a formatted message to a Slack webhook URL.
 * Respects rate limits per project.
 */
async function sendMessage(config: SlackConfig, text: string, blocks: SlackBlock[]): Promise<void> {
  if (!checkRateLimit(config.projectId)) {
    console.warn(
      `[slack] Rate limit exceeded for project ${config.projectId}. Dropping message.`,
    );
    return;
  }

  const response = await fetch(config.webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: buildPayload(text, blocks),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Slack webhook failed (${response.status}): ${body}`);
  }
}

/** Input for a critical feedback alert notification. */
export interface CriticalFeedbackAlertInput {
  feedbackId: string;
  summary: string;
  category: string;
  priority: string;
  reportedBy?: string;
  feedbackUrl: string;
}

/** Send a critical feedback alert to Slack. */
export async function sendCriticalFeedbackAlert(
  config: SlackConfig,
  input: CriticalFeedbackAlertInput,
): Promise<void> {
  const text = `Critical feedback in ${config.projectName}: ${input.summary}`;

  const blocks: SlackBlock[] = [
    {
      type: "header",
      text: { type: "plain_text", text: "Critical Feedback Alert", emoji: true },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${input.summary}*`,
      },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Project:*\n${config.projectName}` },
        { type: "mrkdwn", text: `*Category:*\n${input.category}` },
        { type: "mrkdwn", text: `*Priority:*\n${input.priority}` },
        ...(input.reportedBy
          ? [{ type: "mrkdwn", text: `*Reported by:*\n${input.reportedBy}` }]
          : []),
      ],
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "View Feedback" },
          url: input.feedbackUrl,
        },
      ],
    },
  ];

  await sendMessage(config, text, blocks);
}

/** Input for a drift detection notification. */
export interface DriftDetectedInput {
  driftType: "code" | "requirements";
  affectedArtifact: string;
  description: string;
  detectedAt: string;
  dashboardUrl: string;
}

/** Send a drift detection notification to Slack. */
export async function sendDriftDetectedAlert(
  config: SlackConfig,
  input: DriftDetectedInput,
): Promise<void> {
  const text = `Drift detected in ${config.projectName}: ${input.affectedArtifact}`;

  const blocks: SlackBlock[] = [
    {
      type: "header",
      text: { type: "plain_text", text: "Drift Detected", emoji: true },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${input.affectedArtifact}*\n${input.description}`,
      },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Project:*\n${config.projectName}` },
        { type: "mrkdwn", text: `*Type:*\n${input.driftType}` },
        { type: "mrkdwn", text: `*Detected:*\n${input.detectedAt}` },
      ],
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "View in Dashboard" },
          url: input.dashboardUrl,
        },
      ],
    },
  ];

  await sendMessage(config, text, blocks);
}

/** Input for a work order status change notification. */
export interface WorkOrderStatusChangeInput {
  workOrderId: string;
  workOrderTitle: string;
  previousStatus: string;
  newStatus: string;
  changedBy?: string;
  workOrderUrl: string;
}

/** Send a work order status change notification to Slack. */
export async function sendWorkOrderStatusChange(
  config: SlackConfig,
  input: WorkOrderStatusChangeInput,
): Promise<void> {
  const text = `Work order status changed in ${config.projectName}: ${input.workOrderTitle}`;

  const blocks: SlackBlock[] = [
    {
      type: "header",
      text: { type: "plain_text", text: "Work Order Update", emoji: true },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${input.workOrderTitle}*\n${input.previousStatus} → ${input.newStatus}`,
      },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Project:*\n${config.projectName}` },
        ...(input.changedBy
          ? [{ type: "mrkdwn", text: `*Changed by:*\n${input.changedBy}` }]
          : []),
      ],
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "View Work Order" },
          url: input.workOrderUrl,
        },
      ],
    },
  ];

  await sendMessage(config, text, blocks);
}
