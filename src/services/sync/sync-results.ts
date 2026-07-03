import type {
  DomainSyncState,
  SyncDataDomain,
  SyncDomain,
  SyncError,
  SyncErrorCode,
  SyncResult,
  SyncSource,
} from './sync-types';

export function createSyncError(
  code: SyncErrorCode,
  message: string,
  cause?: unknown,
): SyncError {
  return cause === undefined ? { code, message } : { code, message, cause };
}

export function createEmptySyncResult(
  domain: SyncDomain,
  source: SyncSource = 'local',
  timestamp: string = new Date().toISOString(),
): SyncResult {
  return {
    domain,
    success: true,
    source,
    uploaded: 0,
    downloaded: 0,
    merged: 0,
    skipped: 0,
    conflicts: 0,
    timestamp,
    error: null,
  };
}

export function createFailedSyncResult(
  domain: SyncDomain,
  error: SyncError,
  timestamp: string = new Date().toISOString(),
): SyncResult {
  return {
    ...createEmptySyncResult(domain, 'local', timestamp),
    success: false,
    error,
  };
}

export function createInitialDomainState(
  domain: SyncDataDomain,
): DomainSyncState {
  return {
    domain,
    status: 'idle',
    strategy: 'localOnly',
    lastSyncedAt: null,
    pendingLocalCount: 0,
    pendingRemoteCount: 0,
    error: null,
  };
}

/**
 * Aggregates per-domain results into one 'all' result. Success only when
 * every domain succeeded; a mix becomes PARTIAL_FAILURE so callers never
 * mark a partially failed pass as fully synced.
 */
export function combineSyncResults(
  results: readonly SyncResult[],
): SyncResult {
  if (results.length === 0) {
    return createEmptySyncResult('all', 'merged');
  }

  const failed = results.filter((result) => !result.success);
  const error =
    failed.length === 0
      ? null
      : failed.length === results.length
        ? (failed[0].error ??
          createSyncError('UNKNOWN', 'Sync failed.'))
        : createSyncError(
            'PARTIAL_FAILURE',
            'Some data did not sync. Nothing was changed locally for the parts that failed.',
            failed.map((result) => result.error),
          );

  // ISO timestamps sort lexicographically; the last one is the newest.
  const timestamps = results.map((result) => result.timestamp).sort();

  return {
    domain: 'all',
    success: failed.length === 0,
    source: 'merged',
    uploaded: sum(results, 'uploaded'),
    downloaded: sum(results, 'downloaded'),
    merged: sum(results, 'merged'),
    skipped: sum(results, 'skipped'),
    conflicts: sum(results, 'conflicts'),
    timestamp: timestamps[timestamps.length - 1],
    error,
  };
}

function sum(
  results: readonly SyncResult[],
  key: 'uploaded' | 'downloaded' | 'merged' | 'skipped' | 'conflicts',
): number {
  return results.reduce((total, result) => total + result[key], 0);
}
