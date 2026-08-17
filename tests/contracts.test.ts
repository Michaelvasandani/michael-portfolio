import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateGeneratedCandidate,
  mergeAppendOnlyProjects,
  type GeneratedProject,
  type GeneratedContent,
  type CandidatePatch,
} from '../src/maintainer/contracts.ts';
import { initialMaintainerState } from '../src/maintainer/state.ts';

const existingProject: GeneratedProject = {
  repositoryId: 'R_123',
  repository: 'Michaelvasandani/demo',
  url: 'https://github.com/Michaelvasandani/demo',
  purpose: 'A public project with a verified purpose.',
  contribution: 'Michael authored the feature implementation.',
  technologies: ['TypeScript'],
  evidenceUrl: 'https://github.com/Michaelvasandani/demo/commit/abc123',
  createdAt: '2026-08-16T00:00:00.000Z',
};

const current: GeneratedContent = {
  schemaVersion: 1,
  generatedAt: '2026-08-16T00:00:00.000Z',
  projects: [existingProject],
};

test('merges a newly pinned project without rewriting an existing profile', () => {
  const nextProject = { ...existingProject, repositoryId: 'R_456', repository: 'Michaelvasandani/new' };
  const merged = mergeAppendOnlyProjects(current.projects, [nextProject]);
  assert.deepEqual(merged.map((project) => project.repositoryId), ['R_123', 'R_456']);
  assert.deepEqual(merged[0], existingProject);
});

test('rejects a candidate that removes or changes a Project Profile', () => {
  const changed = { ...existingProject, purpose: 'An unsupported rewritten purpose.' };
  const patch: CandidatePatch = {
    paths: ['_data/generated/projects.json'],
    generated: { ...current, projects: [changed] },
    state: { ...initialMaintainerState(), pinSnapshot: [], representedRepositoryIds: ['R_123'], activityCursor: null },
  };
  assert.throws(() => validateGeneratedCandidate(patch, current), /append-only/i);
});

test('rejects private links and writes outside the generated allowlist', () => {
  const unsafe: CandidatePatch = {
    paths: ['_data/generated/projects.json', '_layouts/default.html'],
    generated: {
      ...current,
      projects: [{ ...existingProject, url: 'https://github.com/private/demo' }],
    },
    state: { ...initialMaintainerState(), pinSnapshot: [], representedRepositoryIds: ['R_123'], activityCursor: null },
  };
  assert.throws(() => validateGeneratedCandidate(unsafe, current), /allowlist|public|evidence/i);
});

test('validates a safe generated candidate and its evidence links', () => {
  const patch: CandidatePatch = {
    paths: ['_data/generated/projects.json', '.portfolio-maintainer/state.json'],
    generated: current,
    state: { ...initialMaintainerState(), pinSnapshot: ['R_123'], representedRepositoryIds: ['R_123'], activityCursor: 'evt-1' },
  };
  assert.equal(validateGeneratedCandidate(patch, current).ok, true);
});
