import test from 'node:test';
import assert from 'node:assert/strict';
import { withRetries } from '../src/maintainer/retry.ts';

test('retries transient failures with a bounded attempt count', async () => {
  let attempts = 0;
  const value = await withRetries(async () => {
    attempts += 1;
    if (attempts < 3) throw Object.assign(new Error('temporary'), { transient: true });
    return 'ok';
  }, { maxAttempts: 3, delayMs: 0 });
  assert.equal(value, 'ok');
  assert.equal(attempts, 3);
});

test('does not retry a permanent failure', async () => {
  let attempts = 0;
  await assert.rejects(() => withRetries(async () => {
    attempts += 1;
    throw Object.assign(new Error('invalid output'), { transient: false });
  }, { maxAttempts: 3, delayMs: 0 }), /invalid output/);
  assert.equal(attempts, 1);
});
