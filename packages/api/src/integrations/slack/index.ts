// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Slack webhook integration for OpenFactory.
 *
 * Sends notifications to configured Slack channels via incoming webhooks.
 * Supports configurable per-project webhook URLs and rate limiting
 * to prevent alert fatigue.
 */

export interface SlackConfig {
  webhookUrl: string;
  enabled: boolean;
}

export type AlertType =
  | "critical_feedback"
  | "drift_detected"
  | "work_order_status_changed";

interface SlackMessage {
  text: string;
  blocks?: SlackBlock[];
}

interface SlackBlock {
  type: string;
  text?: { type: string; text: string };
  elements?: Array<{ type: string; text: string }>;
}

// Rate limit: max 1 message per alert type per project per 60 seconds
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 60_000;

/**
 * Send a notification to Slack via incoming webhook.
 *
 * Returns true if the message was sent, false if rate-limited or failed.
 */
export async function sendSlackNotification(
  config: SlackConfig,
  alertType: AlertType,
  projectId: string,
  message: SlackMessage,
): Promise<boolean> {
  if (!config.enabled || !config.webhookUrl) {
    return false;
  }

  // Rate limiting
  const rateKey = `${projectId}:${alertType}`;
  const lastSent = rateLimitMap.get(rateKey);
  if (lastSent && Date.now() - lastSent < RATE_LIMIT_MS) {
    return false;
  }

  try {
    const response = await fetch(config.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });

    if (response.ok) {
      rateLimitMap.set(rateKey, Date.now());
      return true;
    }

    console.error(`Slack webhook failed: ${response.status} ${response.statusText}`);
    return false;
  } catch (err) {
    console.error("Slack webhook error:", err);
    return false;
  }
}

/**
 * Build a Slack message for a critical feedback alert.
 */
export function buildFeedbackAlert(
  projectName: string,
  feedbackTitle: string,
  category: string,
  priorityScore: number,
): SlackMessage {
  return {
    text: `[${projectName}] Critical feedback: ${feedbackTitle}`,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: `Critical Feedback: ${feedbackTitle}` },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Project:* ${projectName}\n*Category:* ${category}\n*Priority:* ${(priorityScore * 100).toFixed(0)}%`,
        },
      },
    ],
  };
}

/**
 * Build a Slack message for a drift detection alert.
 */
export function buildDriftAlert(
  projectName: string,
  driftType: string,
  description: string,
  severity: string,
): SlackMessage {
  const emoji = severity === "high" ? "!!" : severity === "medium" ? "!" : "";
  return {
    text: `[${projectName}] Drift detected${emoji}: ${driftType}`,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: `Drift Detected: ${driftType}` },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Project:* ${projectName}\n*Severity:* ${severity}\n*Details:* ${description}`,
        },
      },
    ],
  };
}

/**
 * Build a Slack message for a work order status change.
 */
export function buildStatusChangeAlert(
  projectName: string,
  workOrderTitle: string,
  previousStatus: string,
  newStatus: string,
): SlackMessage {
  return {
    text: `[${projectName}] Work order "${workOrderTitle}" moved from ${previousStatus} to ${newStatus}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${workOrderTitle}*\n${previousStatus} -> ${newStatus}`,
        },
      },
    ],
  };
}
