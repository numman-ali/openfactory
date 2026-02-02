/**
 * OpenFactory - Alert Generation
 * SPDX-License-Identifier: AGPL-3.0
 *
 * Creates structured alerts from drift reports and exposes them
 * via the graph API for the agent panel to display.
 */

import { z } from 'zod';
import type { DriftAlert, DriftSeverity } from '@repo/shared/types/graph';
import type { GraphRepository } from './index.js';
import type { DriftReport, DriftReportEntry } from './drift-detector.js';

// ---------------------------------------------------------------------------
// Alert Type Classification
// ---------------------------------------------------------------------------

export const AlertType = z.enum([
  'BLUEPRINT_STALE',
  'WORK_ORDER_OUTDATED',
  'REQUIREMENT_CHANGED',
  'FOUNDATION_CONFLICT',
]);
export type AlertType = z.infer<typeof AlertType>;

// ---------------------------------------------------------------------------
// Structured Alert Output
// ---------------------------------------------------------------------------

export const StructuredAlert = z.object({
  alertId: z.string().uuid(),
  alertType: AlertType,
  affectedNodeId: z.string().uuid(),
  sourceNodeId: z.string().uuid(),
  driftType: z.string(),
  severity: z.enum(['low', 'medium', 'high']),
  description: z.string(),
  suggestedAction: z.string(),
  createdAt: z.string().datetime(),
});
export type StructuredAlert = z.infer<typeof StructuredAlert>;

export const AlertSummary = z.object({
  projectId: z.string().uuid(),
  totalAlerts: z.number().int().nonnegative(),
  bySeverity: z.object({
    high: z.number().int().nonnegative(),
    medium: z.number().int().nonnegative(),
    low: z.number().int().nonnegative(),
  }),
  byType: z.record(AlertType, z.number().int().nonnegative()),
  alerts: z.array(StructuredAlert),
});
export type AlertSummary = z.infer<typeof AlertSummary>;

// ---------------------------------------------------------------------------
// Alert Generator
// ---------------------------------------------------------------------------

export class AlertGenerator {
  constructor(private readonly repo: GraphRepository) {}

  /**
   * Create drift alerts in the database from a DriftReport.
   * Returns the created DriftAlert records.
   */
  async createAlertsFromReport(report: DriftReport): Promise<DriftAlert[]> {
    const alerts: DriftAlert[] = [];

    for (const entry of report.entries) {
      const alert = await this.repo.createDriftAlert({
        projectId: report.projectId,
        sourceNodeId: entry.sourceNodeId,
        targetNodeId: entry.targetNodeId,
        driftType: entry.driftType,
        description: entry.description,
        severity: entry.severity,
        status: 'open',
        resolvedAt: null,
        resolvedBy: null,
      });
      alerts.push(alert);
    }

    return alerts;
  }

  /**
   * Get a structured summary of open alerts for a project,
   * suitable for the agent panel display.
   */
  async getAlertSummary(projectId: string): Promise<AlertSummary> {
    const rawAlerts = await this.repo.listDriftAlerts(projectId, { status: 'open' });

    const bySeverity = { high: 0, medium: 0, low: 0 };
    const byType: Record<string, number> = {
      BLUEPRINT_STALE: 0,
      WORK_ORDER_OUTDATED: 0,
      REQUIREMENT_CHANGED: 0,
      FOUNDATION_CONFLICT: 0,
    };

    const structuredAlerts: StructuredAlert[] = rawAlerts.map((alert) => {
      const alertType = classifyAlertType(alert.driftType);
      const severity = alert.severity as DriftSeverity;

      bySeverity[severity]++;
      byType[alertType]++;

      return {
        alertId: alert.id,
        alertType,
        affectedNodeId: alert.targetNodeId ?? alert.sourceNodeId,
        sourceNodeId: alert.sourceNodeId,
        driftType: alert.driftType,
        severity,
        description: alert.description,
        suggestedAction: buildSuggestedAction(alert.driftType, alertType),
        createdAt: alert.createdAt,
      };
    });

    return {
      projectId,
      totalAlerts: structuredAlerts.length,
      bySeverity,
      byType: byType as Record<AlertType, number>,
      alerts: structuredAlerts,
    };
  }

  /**
   * Create a single alert from a drift report entry (for incremental use).
   */
  async createAlertFromEntry(
    projectId: string,
    entry: DriftReportEntry,
  ): Promise<DriftAlert> {
    return this.repo.createDriftAlert({
      projectId,
      sourceNodeId: entry.sourceNodeId,
      targetNodeId: entry.targetNodeId,
      driftType: entry.driftType,
      description: entry.description,
      severity: entry.severity,
      status: 'open',
      resolvedAt: null,
      resolvedBy: null,
    });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function classifyAlertType(driftType: string): AlertType {
  switch (driftType) {
    case 'code_drift':
      return 'BLUEPRINT_STALE';
    case 'work_order_drift':
      return 'WORK_ORDER_OUTDATED';
    case 'requirements_drift':
      return 'REQUIREMENT_CHANGED';
    case 'foundation_drift':
      return 'FOUNDATION_CONFLICT';
    default:
      return 'BLUEPRINT_STALE';
  }
}

function buildSuggestedAction(driftType: string, alertType: AlertType): string {
  const actions: Record<AlertType, string> = {
    BLUEPRINT_STALE: 'Open the Foundry module and use the drift resolution workflow to sync the blueprint with current code.',
    WORK_ORDER_OUTDATED: 'Open the Planner module and use the sync workflow to update work orders against the latest blueprint.',
    REQUIREMENT_CHANGED: 'Open the Foundry module to review and reconcile the blueprint with updated requirements.',
    FOUNDATION_CONFLICT: 'Review the foundation blueprint changes and check all linked feature blueprints for consistency.',
  };
  return actions[alertType];
}
