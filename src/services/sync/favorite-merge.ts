import type { ParkingClusterResponse } from '@/types/parking-map';
import { normalizeStoredFavorite } from '@/utils/favorite-parking-storage';

import type { SyncConflict } from './sync-types';
import {
  isNonEmptyString,
  isRecord,
  stableStringify,
} from './sync-validation';

export type FavoriteMergeResult = {
  favorites: ParkingClusterResponse[];
  /** Favorites Phase 4B must upsert to user_favorites (local-only + local conflict winners). */
  uploadedCandidates: ParkingClusterResponse[];
  /** Favorites that came from remote and are new to this device. */
  downloadedCandidates: ParkingClusterResponse[];
  /** How many favorite ids existed on both sides. */
  mergedCount: number;
  conflicts: SyncConflict[];
};

type RemoteFavorite = {
  favorite: ParkingClusterResponse;
  updatedAt: string | null;
};

/**
 * Maps a user_favorites row (unknown until validated) to a displayable
 * favorite. The snapshot must pass the same validation as locally stored
 * favorites; rows without a usable snapshot are dropped from the merge —
 * they stay untouched in the cloud, but this device cannot display them.
 */
function normalizeRemoteFavoriteRow(value: unknown): RemoteFavorite | null {
  if (!isRecord(value) || !isNonEmptyString(value.segment_id)) {
    return null;
  }

  const favorite = normalizeStoredFavorite(value.snapshot);

  if (!favorite) {
    return null;
  }

  return {
    // The row key wins over whatever id the snapshot carries.
    favorite:
      favorite.id === value.segment_id
        ? favorite
        : { ...favorite, id: value.segment_id },
    updatedAt: isNonEmptyString(value.updated_at) ? value.updated_at : null,
  };
}

/**
 * Pure merge of local favorites with user_favorites rows. Never mutates its
 * inputs, never drops a local favorite, and performs no I/O.
 *
 * Merge key: the favorite id (stored as segment_id remotely). Local
 * favorites carry no updatedAt, so on differing content the local version
 * wins (the remote timestamp alone is not evidence the remote data is
 * newer than an untimestamped local change). Identical content — compared
 * order-insensitively, since jsonb reorders keys — is not a conflict.
 */
export function mergeFavorites(
  localFavorites: readonly ParkingClusterResponse[],
  remoteRows: readonly unknown[],
): FavoriteMergeResult {
  const localById = new Map<string, ParkingClusterResponse>();
  for (const favorite of localFavorites) {
    if (!favorite.id || localById.has(favorite.id)) {
      continue;
    }
    localById.set(favorite.id, favorite);
  }

  const remoteById = new Map<string, RemoteFavorite>();
  for (const row of remoteRows) {
    const remote = normalizeRemoteFavoriteRow(row);
    if (!remote || remoteById.has(remote.favorite.id)) {
      continue;
    }
    remoteById.set(remote.favorite.id, remote);
  }

  const favorites: ParkingClusterResponse[] = [];
  const uploadedCandidates: ParkingClusterResponse[] = [];
  const downloadedCandidates: ParkingClusterResponse[] = [];
  const conflicts: SyncConflict[] = [];
  let mergedCount = 0;

  // Local order first, remote-only favorites appended afterwards.
  for (const [id, localFavorite] of localById) {
    const remote = remoteById.get(id);

    if (!remote) {
      favorites.push(localFavorite);
      uploadedCandidates.push(localFavorite);
      continue;
    }

    mergedCount += 1;

    if (
      stableStringify(localFavorite) === stableStringify(remote.favorite)
    ) {
      favorites.push(localFavorite);
      continue;
    }

    conflicts.push({ domain: 'favorites', key: id, winner: 'local' });
    favorites.push(localFavorite);
    uploadedCandidates.push(localFavorite);
  }

  for (const [id, remote] of remoteById) {
    if (localById.has(id)) {
      continue;
    }
    favorites.push(remote.favorite);
    downloadedCandidates.push(remote.favorite);
  }

  return {
    favorites,
    uploadedCandidates,
    downloadedCandidates,
    mergedCount,
    conflicts,
  };
}
