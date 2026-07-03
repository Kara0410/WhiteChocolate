import assert from 'node:assert/strict';
import test from 'node:test';

import {
  countLocalPreferences,
  determineAccountSyncState,
  getLocalSnapshot,
  getRemoteSnapshotPlaceholder,
} from '../src/services/sync/sync-manager';
import type { Vehicle } from '../src/types/vehicle';
import { saveFavorites } from '../src/utils/favorite-parking-storage';
import {
  DEFAULT_PREFERENCES,
  savePreferences,
} from '../src/utils/preferences-storage';
import { saveVehicleState } from '../src/utils/vehicle-storage';
import { createMemoryStorage } from './helpers/memory-storage';

function vehicle(id: string): Vehicle {
  return {
    id,
    nickname: `Car ${id}`,
    licensePlate: `M AB ${id.toUpperCase()}`,
    createdAt: '2026-07-01T00:00:00.000Z',
  };
}

const EMPTY_COUNTS = { vehicles: 0, favorites: 0, preferences: 0 };

test('getLocalSnapshot loads data and counts from storage', async () => {
  const storage = createMemoryStorage();
  await saveVehicleState(
    { activeVehicleId: 'one', vehicles: [vehicle('one'), vehicle('two')] },
    storage,
  );
  await saveFavorites(
    [
      {
        id: 'fav-1',
        type: 'spot',
        latitude: 48.1,
        longitude: 11.5,
        availabilityPercent: 50,
        count: 1,
        totalCapacity: 10,
        availableSpots: 5,
        colorStatus: 'orange',
        minPrice: null,
        avgPrice: null,
        bestSpot: {
          id: 'fav-1-best',
          zoneName: 'Altstadt',
          availableSpots: 5,
          availabilityPercent: 50,
          pricePerHour: null,
        },
      },
    ],
    storage,
  );
  await savePreferences(
    { ...DEFAULT_PREFERENCES, notifications: true },
    storage,
  );

  const snapshot = await getLocalSnapshot(storage);

  assert.deepEqual(snapshot.counts, {
    vehicles: 2,
    favorites: 1,
    preferences: 1,
  });
  assert.equal(snapshot.vehicles.activeVehicleId, 'one');
  assert.equal(snapshot.favorites[0].id, 'fav-1');
  assert.equal(snapshot.preferences.notifications, true);
});

test('getLocalSnapshot on empty storage reports zero everywhere', async () => {
  const snapshot = await getLocalSnapshot(createMemoryStorage());

  assert.deepEqual(snapshot.counts, EMPTY_COUNTS);
  assert.deepEqual(snapshot.preferences, DEFAULT_PREFERENCES);
});

test('default preferences do not count as local data', () => {
  assert.equal(countLocalPreferences(DEFAULT_PREFERENCES), 0);
  assert.equal(
    countLocalPreferences({ ...DEFAULT_PREFERENCES, units: 'imperial' }),
    1,
  );
});

test('the remote snapshot placeholder is empty and never touches the network', () => {
  const snapshot = getRemoteSnapshotPlaceholder('2026-07-03T10:00:00.000Z');

  assert.deepEqual(snapshot.vehicles, []);
  assert.deepEqual(snapshot.favorites, []);
  assert.equal(snapshot.preferences, null);
  assert.deepEqual(snapshot.counts, EMPTY_COUNTS);
  assert.equal(snapshot.fetchedAt, '2026-07-03T10:00:00.000Z');
});

test('anonymous users are local-only in every domain', () => {
  const state = determineAccountSyncState({
    isAuthenticated: false,
    localCounts: { vehicles: 2, favorites: 1, preferences: 1 },
    remoteCounts: EMPTY_COUNTS,
  });

  assert.equal(state.status, 'idle');
  for (const domain of ['vehicles', 'favorites', 'preferences'] as const) {
    assert.equal(state.domains[domain].strategy, 'localOnly');
    assert.equal(state.domains[domain].status, 'idle');
  }
});

test('local data with an empty account needs an upload sync', () => {
  const state = determineAccountSyncState({
    isAuthenticated: true,
    localCounts: { vehicles: 2, favorites: 0, preferences: 1 },
    remoteCounts: EMPTY_COUNTS,
  });

  assert.equal(state.status, 'needsSync');
  assert.equal(state.domains.vehicles.strategy, 'localUpload');
  assert.equal(state.domains.favorites.strategy, 'noAction');
  assert.equal(state.domains.preferences.strategy, 'localUpload');
  assert.equal(state.domains.vehicles.pendingLocalCount, 2);
});

test('remote data with an empty device needs a restore sync', () => {
  const state = determineAccountSyncState({
    isAuthenticated: true,
    localCounts: EMPTY_COUNTS,
    remoteCounts: { vehicles: 3, favorites: 2, preferences: 1 },
  });

  assert.equal(state.status, 'needsSync');
  assert.equal(state.domains.vehicles.strategy, 'remoteRestore');
  assert.equal(state.domains.vehicles.pendingRemoteCount, 3);
});

test('data on both sides needs a merge sync', () => {
  const state = determineAccountSyncState({
    isAuthenticated: true,
    localCounts: { vehicles: 1, favorites: 1, preferences: 1 },
    remoteCounts: { vehicles: 2, favorites: 1, preferences: 1 },
  });

  assert.equal(state.domains.vehicles.strategy, 'merge');
  assert.equal(state.status, 'needsSync');
});

test('dismissing the prompt turns the session local-only', () => {
  const state = determineAccountSyncState({
    isAuthenticated: true,
    localCounts: { vehicles: 1, favorites: 0, preferences: 0 },
    remoteCounts: EMPTY_COUNTS,
    dismissedThisSession: true,
  });

  assert.equal(state.status, 'idle');
  assert.equal(state.domains.vehicles.strategy, 'localOnly');
});

test('a completed sync with nothing pending reads as synced', () => {
  const state = determineAccountSyncState({
    isAuthenticated: true,
    localCounts: EMPTY_COUNTS,
    remoteCounts: EMPTY_COUNTS,
    lastSyncedAt: '2026-07-03T10:00:00.000Z',
  });

  assert.equal(state.status, 'synced');
  assert.equal(state.domains.vehicles.status, 'synced');
  assert.equal(state.lastSyncedAt, '2026-07-03T10:00:00.000Z');
});
