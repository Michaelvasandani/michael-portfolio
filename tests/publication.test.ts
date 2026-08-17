import test from 'node:test';
import assert from 'node:assert/strict';
import { decidePublicationRoute } from '../src/maintainer/publication.ts';

test('chooses direct publication only for validated generated-only changes', () => {
  assert.equal(decidePublicationRoute({ changedPaths: ['_data/generated/projects.json'], valid: true, branchRequiresPullRequest: false, requiresHumanReview: false }), 'direct');
});

test('escalates uncertain but otherwise valid generated work for review', () => {
  assert.equal(decidePublicationRoute({ changedPaths: ['_data/generated/projects.json'], valid: true, branchRequiresPullRequest: true, requiresHumanReview: false }), 'pull-request');
  assert.equal(decidePublicationRoute({ changedPaths: ['_data/generated/recent-work.json'], valid: true, branchRequiresPullRequest: false, requiresHumanReview: true }), 'pull-request');
});

test('aborts protected, structural, stale, or invalid candidates', () => {
  assert.equal(decidePublicationRoute({ changedPaths: ['_layouts/default.html'], valid: true, branchRequiresPullRequest: false, requiresHumanReview: false }), 'abort');
  assert.equal(decidePublicationRoute({ changedPaths: ['_data/generated/projects.json'], valid: false, branchRequiresPullRequest: false, requiresHumanReview: false }), 'abort');
  assert.equal(decidePublicationRoute({ changedPaths: ['_data/generated/projects.json'], valid: true, branchRequiresPullRequest: false, requiresHumanReview: false, staleBase: true }), 'abort');
});
