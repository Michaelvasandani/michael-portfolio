import test from 'node:test';
import assert from 'node:assert/strict';
import { generateProjectProfile } from '../src/maintainer/generator.ts';
import type { EvidenceBundle } from '../src/maintainer/types.ts';

const evidence: EvidenceBundle = {
  repository: { id: 'R_1', fullName: 'Michaelvasandani/demo', url: 'https://github.com/Michaelvasandani/demo', description: 'Demo', defaultBranch: 'main', topics: ['agents'], languages: ['TypeScript'] },
  readme: 'A public project.',
  commits: [{ sha: 'abc', message: 'Implement workflow', url: 'https://github.com/Michaelvasandani/demo/commit/abc', authoredAt: '2026-08-15T00:00:00.000Z', authorLogin: 'Michaelvasandani' }],
  pullRequests: [],
  releases: [],
  changedFiles: ['src/workflow.ts'],
};

test('requests strict structured output and binds profile identity to the verified repository', async () => {
  let body = '';
  const fetchImpl = async (_input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    body = String(init?.body ?? '');
    return new Response(JSON.stringify({ output_text: JSON.stringify({ purpose: 'A verified workflow.', contribution: 'Michael authored the workflow.', technologies: ['TypeScript'] }) }), { status: 200 });
  };
  const profile = await generateProjectProfile(evidence, { apiKey: 'test-key', model: 'test-model', fetchImpl }, '2026-08-16T00:00:00.000Z', 'PIN_NODE_ID');
  const request = JSON.parse(body) as { text?: { format?: { type?: string; strict?: boolean } } };
  assert.equal(request.text?.format?.type, 'json_schema');
  assert.equal(request.text?.format?.strict, true);
  assert.equal(profile.repositoryId, 'PIN_NODE_ID');
});
