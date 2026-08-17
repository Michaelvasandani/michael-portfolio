import type { MaintainerState, PinSnapshot } from './types.ts';

export type { PinSnapshot } from './types.ts';

export function initialMaintainerState(): MaintainerState {
  return {
    schemaVersion: 1,
    pinSnapshot: [],
    representedRepositoryIds: [],
    activityCursor: null,
    lastPinSyncAt: null,
    lastDigestRefreshAt: null,
    checkpoint: null,
    publishedRevision: null,
    openIncidentFingerprints: [],
    openReviewFingerprints: [],
  };
}

export function detectNewPins(previous: PinSnapshot[], current: PinSnapshot[]): PinSnapshot[] {
  const previousIds = new Set(previous.map((pin) => pin.repositoryId));
  return current.filter((pin) => !previousIds.has(pin.repositoryId));
}

function validatePins(pins: PinSnapshot[]): void {
  const ids = new Set<string>();
  for (const pin of pins) {
    if (!pin.repositoryId || ids.has(pin.repositoryId)) throw new Error('Pin snapshot contains duplicate or missing repository IDs');
    if (pin.isPrivate) throw new Error('Portfolio Maintainer accepts public repositories only');
    if (pin.isFork) throw new Error('Portfolio Maintainer does not represent forked repositories');
    ids.add(pin.repositoryId);
  }
}

export function reconcilePinState(state: MaintainerState, current: PinSnapshot[], now = new Date().toISOString()): MaintainerState {
  validatePins(current);
  const represented = [...new Set([...state.representedRepositoryIds, ...current.map((pin) => pin.repositoryId)])];
  return {
    ...state,
    schemaVersion: 1,
    pinSnapshot: current.map((pin) => pin.repositoryId),
    representedRepositoryIds: represented,
    lastPinSyncAt: now,
  };
}
