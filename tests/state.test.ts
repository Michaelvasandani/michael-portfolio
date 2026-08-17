import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectNewPins,
  reconcilePinState,
  initialMaintainerState,
  type PinSnapshot,
} from '../src/maintainer/state.ts';

const pin = (id: string): PinSnapshot => ({
  repositoryId: id,
  repository: `Michaelvasandani/${id.toLowerCase()}`,
  url: `https://github.com/Michaelvasandani/${id.toLowerCase()}`,
  isPrivate: false,
  isFork: false,
});

test('detects a pin that appears between successful snapshots', () => {
  const previous = [pin('R_1')];
  const current = [pin('R_1'), pin('R_2')];
  assert.deepEqual(detectNewPins(previous, current).map((item) => item.repositoryId), ['R_2']);
});

test('keeps represented projects after an unpin', () => {
  const state = initialMaintainerState();
  const afterFirstRun = reconcilePinState(state, [pin('R_1'), pin('R_2')]);
  const afterUnpin = reconcilePinState(afterFirstRun, [pin('R_2')]);
  assert.deepEqual(afterUnpin.pinSnapshot, ['R_2']);
  assert.deepEqual(afterUnpin.representedRepositoryIds, ['R_1', 'R_2']);
});

test('rejects a pin snapshot that contains private or forked repositories', () => {
  assert.throws(() => reconcilePinState(initialMaintainerState(), [{ ...pin('R_1'), isPrivate: true }]), /public/i);
  assert.throws(() => reconcilePinState(initialMaintainerState(), [{ ...pin('R_1'), isFork: true }]), /fork/i);
});
