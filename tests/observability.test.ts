import test from 'node:test';
import assert from 'node:assert/strict';
import { buildIncidentFingerprint, overdueObjectives, buildRunSummary } from '../src/maintainer/observability.ts';
import { initialMaintainerState } from '../src/maintainer/state.ts';

test('deduplicates incidents by failure class and scope', () => {
  assert.equal(buildIncidentFingerprint('openai-invalid-output', 'digest'), buildIncidentFingerprint('openai-invalid-output', 'digest'));
  assert.notEqual(buildIncidentFingerprint('openai-invalid-output', 'digest'), buildIncidentFingerprint('github-rate-limit', 'digest'));
});

test('marks pin and digest objectives overdue from the last successful timestamps', () => {
  const state = { ...initialMaintainerState(), lastPinSyncAt: '2026-08-14T00:00:00.000Z', lastDigestRefreshAt: '2026-08-07T00:00:00.000Z' };
  const overdue = overdueObjectives(state, '2026-08-16T12:00:00.000Z');
  assert.deepEqual(overdue, ['pin-sync', 'digest-refresh']);
});

test('summarizes checkpoint and deployment state without exposing secrets', () => {
  const summary = buildRunSummary({ mode: 'pins', trigger: 'schedule', stages: { discovery: 'passed', generation: 'passed', validation: 'passed', persistence: 'passed', deployment: 'pending' }, retries: 1, checkpoint: 'abc123', deployment: 'pending' });
  assert.match(summary, /pins/);
  assert.match(summary, /abc123/);
  assert.doesNotMatch(summary, /token|secret|key/i);
});
