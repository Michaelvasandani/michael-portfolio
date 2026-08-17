import test from 'node:test';
import assert from 'node:assert/strict';
import { validateDigest, type RecentWorkDigest } from '../src/maintainer/digest.ts';

const entry = (id: string) => ({
  id,
  date: '2026-08-15',
  headline: 'Shipped a source-traceable workflow',
  summary: 'Michael authored a substantive workflow change and connected it to public evidence.',
  technologies: ['TypeScript'],
  evidenceUrl: `https://github.com/Michaelvasandani/demo/commit/${id}`,
});

test('accepts at most three evidence-backed digest entries', () => {
  const digest: RecentWorkDigest = {
    schemaVersion: 1,
    updatedAt: '2026-08-16T00:00:00.000Z',
    entries: [entry('a'), entry('b'), entry('c')],
  };
  assert.equal(validateDigest(digest).ok, true);
});

test('rejects a digest with four entries or non-GitHub evidence', () => {
  const digest = {
    schemaVersion: 1,
    updatedAt: '2026-08-16T00:00:00.000Z',
    entries: [entry('a'), entry('b'), entry('c'), entry('d')],
  };
  assert.throws(() => validateDigest(digest as RecentWorkDigest), /three|3/i);
  assert.throws(() => validateDigest({ ...digest, entries: [{ ...entry('a'), evidenceUrl: 'https://example.com' }] } as RecentWorkDigest), /evidence|GitHub/i);
});
