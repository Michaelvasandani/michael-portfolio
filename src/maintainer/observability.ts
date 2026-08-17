import { createHash } from 'node:crypto';
import type { MaintainerState } from './types.ts';

export type Objective = 'pin-sync' | 'digest-refresh';

export function buildIncidentFingerprint(failureClass: string, scope: string): string {
  return createHash('sha256').update(`${failureClass}\0${scope}`).digest('hex').slice(0, 24);
}

export function overdueObjectives(state: Pick<MaintainerState, 'lastPinSyncAt' | 'lastDigestRefreshAt'>, now = new Date().toISOString()): Objective[] {
  const current = Date.parse(now);
  const overdue: Objective[] = [];
  if (state.lastPinSyncAt && current - Date.parse(state.lastPinSyncAt) > 24 * 60 * 60 * 1000) overdue.push('pin-sync');
  if (state.lastDigestRefreshAt && current - Date.parse(state.lastDigestRefreshAt) > 8 * 24 * 60 * 60 * 1000) overdue.push('digest-refresh');
  return overdue;
}

export interface RunSummaryInput {
  mode: string;
  trigger: string;
  stages: Record<string, 'passed' | 'failed' | 'pending' | 'skipped'>;
  retries: number;
  checkpoint: string | null;
  deployment: 'passed' | 'failed' | 'pending' | 'skipped';
  escalation?: string | null;
}

export function buildRunSummary(input: RunSummaryInput): string {
  const stageLines = Object.entries(input.stages).map(([stage, result]) => `- ${stage}: ${result}`).join('\n');
  return [
    `## Portfolio Maintainer · ${input.mode}`,
    '',
    `- Trigger: ${input.trigger}`,
    `- Retries: ${input.retries}`,
    `- Maintainer Checkpoint: ${input.checkpoint ?? 'none'}`,
    `- Pages deployment: ${input.deployment}`,
    input.escalation ? `- Escalation: ${input.escalation}` : '- Escalation: none',
    '',
    '### Stages',
    stageLines,
  ].join('\n');
}

export function buildIncidentIssue(failureClass: string, scope: string, details: string, fingerprint = buildIncidentFingerprint(failureClass, scope)): { title: string; body: string; fingerprint: string } {
  return {
    title: `[Portfolio Maintainer] ${failureClass} · ${scope}`,
    body: `## Maintainer Incident\n\n- Fingerprint: \`${fingerprint}\`\n- Failure class: ${failureClass}\n- Scope: ${scope}\n\n${details}\n\nThis incident is deduplicated by fingerprint. The last known-good Published Revision remains authoritative until recovery succeeds.`,
    fingerprint,
  };
}

export function buildRecoveryComment(fingerprint: string, revision: string): string {
  return `Portfolio Maintainer recovered incident \`${fingerprint}\` and validated checkpoint \`${revision}\`. The exact checkpoint is ready for normal Pages deployment.`;
}
