/**
 * Sync manager shell (Phase 4A). Prepares the contract Phase 4B will
 * implement with real Supabase reads/writes. Nothing in this file performs
 * network I/O, and nothing here is wired into React yet.
 */

import type {
  UserFavoriteRow,
  UserPreferencesRow,
} from '@/types/database-aliases';
import type { ParkingClusterResponse } from '@/types/parking-map';
import type { Preferences } from '@/types/preferences';
import type { KeyValueStorage } from '@/types/storage';
import { loadStoredFavorites } from '@/utils/favorite-parking-storage';
import {
  DEFAULT_PREFERENCES,
  loadPreferences,
} from '@/utils/preferences-storage';

import { determineSyncStrategy } from './sync-decision';
import { PREFERENCE_KEYS } from './preference-merge';
import type {
  AccountSyncState,
  DomainSyncState,
  SyncDataDomain,
  SyncStatus,
  SyncStrategy,
} from './sync-types';
import { SYNC_DATA_DOMAINS } from './sync-types';

export type SyncDomainCounts = Record<SyncDataDomain, number>;

export type LocalDataSnapshot = {
  favorites: ParkingClusterResponse[];
  preferences: Preferences;
  counts: SyncDomainCounts;
};

export type RemoteDataSnapshot = {
  favorites: UserFavoriteRow[];
  preferences: UserPreferencesRow | null;
  counts: SyncDomainCounts;
  fetchedAt: string;
};

/**
 * Preferences "count" for sync decisions: 1 when the local preferences
 * differ from the defaults (there is something worth uploading), else 0.
 */
export function countLocalPreferences(preferences: Preferences): number {
  return PREFERENCE_KEYS.some(
    (key) => !Object.is(preferences[key], DEFAULT_PREFERENCES[key]),
  )
    ? 1
    : 0;
}

/** Loads everything sync cares about from local storage in one pass. */
export async function getLocalSnapshot(
  storage?: KeyValueStorage,
): Promise<LocalDataSnapshot> {
  const [favorites, preferences] = await Promise.all([
    loadStoredFavorites(storage),
    loadPreferences(storage),
  ]);

  return {
    favorites,
    preferences,
    counts: {
      favorites: favorites.length,
      preferences: countLocalPreferences(preferences),
    },
  };
}

/**
 * Phase 4B replaces this with real queries against user_favorites and
 * user_preferences through the shared Supabase client.
 * The shape is final; only the data source changes.
 */
export function getRemoteSnapshotPlaceholder(
  fetchedAt: string = new Date().toISOString(),
): RemoteDataSnapshot {
  return {
    favorites: [],
    preferences: null,
    counts: { favorites: 0, preferences: 0 },
    fetchedAt,
  };
}

export type DetermineAccountSyncStateInput = {
  isAuthenticated: boolean;
  localCounts: SyncDomainCounts;
  remoteCounts: SyncDomainCounts;
  dismissedThisSession?: boolean;
  lastSyncedAt?: string | null;
};

function strategyToStatus(
  strategy: SyncStrategy,
  lastSyncedAt: string | null,
): SyncStatus {
  switch (strategy) {
    case 'localUpload':
    case 'remoteRestore':
    case 'merge':
      return 'needsSync';
    case 'noAction':
      return lastSyncedAt ? 'synced' : 'idle';
    case 'localOnly':
    case 'remoteOnly':
      return 'idle';
  }
}

/**
 * Derives the full per-domain sync state from counts. Pure: safe to call
 * on every auth or data change. Anonymous users always come out as
 * localOnly/idle — nothing may touch Supabase user tables for them.
 */
export function determineAccountSyncState(
  input: DetermineAccountSyncStateInput,
): AccountSyncState {
  const lastSyncedAt = input.lastSyncedAt ?? null;
  const domains = {} as Record<SyncDataDomain, DomainSyncState>;

  for (const domain of SYNC_DATA_DOMAINS) {
    const strategy = determineSyncStrategy({
      isAuthenticated: input.isAuthenticated,
      localCount: input.localCounts[domain],
      remoteCount: input.remoteCounts[domain],
      dismissedThisSession: input.dismissedThisSession,
    });

    domains[domain] = {
      domain,
      status: strategyToStatus(strategy, lastSyncedAt),
      strategy,
      lastSyncedAt,
      pendingLocalCount: Math.max(0, input.localCounts[domain]),
      pendingRemoteCount: Math.max(0, input.remoteCounts[domain]),
      error: null,
    };
  }

  const needsSync = SYNC_DATA_DOMAINS.some(
    (domain) => domains[domain].status === 'needsSync',
  );

  return {
    status: needsSync ? 'needsSync' : lastSyncedAt ? 'synced' : 'idle',
    domains,
    lastSyncedAt,
    error: null,
  };
}
