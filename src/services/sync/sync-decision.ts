import type { SyncStrategy } from './sync-types';

export type SyncDecisionInput = {
  isAuthenticated: boolean;
  localCount: number;
  remoteCount: number;
  /**
   * Set by Phase 4B after a first sync completed: whether either side changed
   * since. When both are explicitly false there is nothing to move. A single
   * flag (or omitted flags) falls through to the count-based rules.
   */
  hasLocalChanges?: boolean;
  hasRemoteChanges?: boolean;
  /** True after the user tapped "Not now" on the sync prompt this session. */
  dismissedThisSession?: boolean;
};

/**
 * Pure decision engine for what a sync pass should do. Never called for
 * side effects; Phase 4B feeds it counts and renders prompts from the
 * returned strategy. Local data is never deleted by any strategy.
 */
export function determineSyncStrategy(input: SyncDecisionInput): SyncStrategy {
  if (!input.isAuthenticated) {
    return 'localOnly';
  }

  const localCount = Math.max(0, input.localCount);
  const remoteCount = Math.max(0, input.remoteCount);

  if (localCount === 0 && remoteCount === 0) {
    return 'noAction';
  }

  // "Not now" means: stay local for the rest of this session, but do not
  // forget that data exists — the next session may prompt again.
  if (input.dismissedThisSession) {
    return 'localOnly';
  }

  if (input.hasLocalChanges === false && input.hasRemoteChanges === false) {
    return 'noAction';
  }

  if (localCount > 0 && remoteCount === 0) {
    return 'localUpload';
  }

  if (localCount === 0 && remoteCount > 0) {
    return 'remoteRestore';
  }

  return 'merge';
}
