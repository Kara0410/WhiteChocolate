/**
 * Shared types for the cloud sync layer (Phase 4A).
 *
 * This module is deliberately free of React and Supabase imports: everything
 * here describes data that flows between the pure merge helpers, the sync
 * decision engine, and (in Phase 4B) the network sync runner.
 */

/** Data domains that sync independently. */
export type SyncDataDomain = 'favorites' | 'preferences';

/** A data domain, or 'all' for aggregate results across every domain. */
export type SyncDomain = SyncDataDomain | 'all';

export const SYNC_DATA_DOMAINS: readonly SyncDataDomain[] = [
  'favorites',
  'preferences',
];

export type SyncStatus =
  | 'idle'
  | 'needsSync'
  | 'syncing'
  | 'synced'
  | 'error';

/**
 * What a sync pass should do for a domain.
 *
 * 'remoteOnly' is reserved: no decision rule produces it in Phase 4A, but
 * Phase 4B's restore flow may use it transiently (cloud-authoritative pull).
 */
export type SyncStrategy =
  | 'noAction'
  | 'localUpload'
  | 'remoteRestore'
  | 'merge'
  | 'localOnly'
  | 'remoteOnly';

/** Which side produced a piece of merged data. */
export type SyncSource = 'local' | 'remote' | 'merged';

export type SyncErrorCode =
  | 'NOT_AUTHENTICATED'
  | 'NETWORK_FAILED'
  | 'DOWNLOAD_FAILED'
  | 'UPLOAD_FAILED'
  | 'MERGE_FAILED'
  | 'PARTIAL_FAILURE'
  | 'NOT_IMPLEMENTED'
  | 'UNKNOWN';

export type SyncError = {
  code: SyncErrorCode;
  message: string;
  cause?: unknown;
};

/**
 * One same-key collision resolved during a merge. `key` is the merge key of
 * the domain: favorite/segment id (favorites), or preference key
 * (preferences). Identical copies on both sides are not conflicts.
 */
export type SyncConflict = {
  domain: SyncDataDomain;
  key: string;
  winner: Exclude<SyncSource, 'merged'>;
};

export type DomainSyncState = {
  domain: SyncDataDomain;
  status: SyncStatus;
  strategy: SyncStrategy;
  lastSyncedAt: string | null;
  /**
   * Approximation in Phase 4A: the local/remote item counts. Phase 4B can
   * refine these to true deltas once it knows what is already synced.
   */
  pendingLocalCount: number;
  pendingRemoteCount: number;
  error: SyncError | null;
};

export type AccountSyncState = {
  status: SyncStatus;
  domains: Record<SyncDataDomain, DomainSyncState>;
  lastSyncedAt: string | null;
  error: SyncError | null;
};

export type SyncResult = {
  domain: SyncDomain;
  success: boolean;
  source: SyncSource;
  uploaded: number;
  downloaded: number;
  merged: number;
  skipped: number;
  conflicts: number;
  timestamp: string;
  error: SyncError | null;
};
