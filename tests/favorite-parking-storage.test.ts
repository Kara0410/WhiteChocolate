import assert from 'node:assert/strict';
import test from 'node:test';

import type { ParkingClusterResponse } from '../src/types/parking-map';
import {
  clearStoredFavorites,
  FAVORITES_STORAGE_KEY,
  loadStoredFavoriteState,
  loadStoredFavorites,
  normalizeStoredFavoriteState,
  normalizeStoredFavorites,
  saveFavoriteState,
  saveFavorites,
} from '../src/utils/favorite-parking-storage';
import { createMemoryStorage } from './helpers/memory-storage';

function favorite(id: string): ParkingClusterResponse {
  return {
    id,
    type: 'spot',
    latitude: 48.137,
    longitude: 11.575,
    availabilityPercent: 60,
    count: 1,
    totalCapacity: 20,
    availableSpots: 12,
    colorStatus: 'green',
    minPrice: 2.5,
    avgPrice: 3,
    bestSpot: {
      id: `${id}-best`,
      zoneName: 'Altstadt',
      availableSpots: 12,
      availabilityPercent: 60,
      pricePerHour: 2.5,
    },
  };
}

test('returns no favorites for missing or malformed stored data', () => {
  assert.deepEqual(normalizeStoredFavorites(null), []);
  assert.deepEqual(normalizeStoredFavorites('nope'), []);
  assert.deepEqual(normalizeStoredFavorites({ favorites: [] }), []);
});

test('keeps valid favorites and drops malformed entries', () => {
  const result = normalizeStoredFavorites([
    favorite('one'),
    'not-a-favorite',
    { ...favorite('missing-best-spot'), bestSpot: null },
    { ...favorite('bad-coords'), latitude: 'north' },
    { ...favorite('bad-color'), colorStatus: 'purple' },
    { ...favorite('bad-type'), type: 'street' },
    favorite('two'),
  ]);

  assert.deepEqual(
    result.map(({ id }) => id),
    ['one', 'two'],
  );
});

test('drops duplicate favorites by id', () => {
  const result = normalizeStoredFavorites([
    favorite('one'),
    { ...favorite('one'), availableSpots: 3 },
    favorite('two'),
  ]);

  assert.deepEqual(
    result.map(({ id }) => id),
    ['one', 'two'],
  );
  assert.equal(result[0].availableSpots, 12);
});

test('omits invalid optional fields but keeps the favorite', () => {
  const result = normalizeStoredFavorites([
    {
      ...favorite('one'),
      minPrice: 'free',
      walkingCategory: 'sprint',
      expansionZoom: 'high',
      zoneName: 'Altstadt',
      distanceToDestination: 250,
    },
  ]);

  assert.equal(result.length, 1);
  assert.equal(result[0].minPrice, null);
  assert.equal(result[0].walkingCategory, undefined);
  assert.equal(result[0].expansionZoom, undefined);
  assert.equal(result[0].zoneName, 'Altstadt');
  assert.equal(result[0].distanceToDestination, 250);
});

test('saves and loads favorites round trip', async () => {
  const storage = createMemoryStorage();
  const favorites = [favorite('one'), favorite('two')];

  await saveFavorites(favorites, storage);
  assert.deepEqual(await loadStoredFavorites(storage), favorites);
});

test('migrates legacy snapshots to stable segment references', () => {
  const state = normalizeStoredFavoriteState([
    favorite('one'),
    favorite('two'),
  ]);
  assert.deepEqual(
    state.favorites.map(({ reference }) => ({
      entityId: reference.entityId,
      entityType: reference.entityType,
    })),
    [
      { entityId: 'one', entityType: 'segment' },
      { entityId: 'two', entityType: 'segment' },
    ],
  );
  assert.equal(state.favorites[0].cachedItem?.id, 'one');
});

test('version 2 storage retains references without requiring cached data', async () => {
  const storage = createMemoryStorage();
  await saveFavoriteState(
    {
      version: 2,
      favorites: [
        {
          reference: {
            entityId: 'segment-7',
            entityType: 'segment',
            createdAt: '2026-07-13T10:00:00.000Z',
          },
          cachedItem: null,
        },
      ],
    },
    storage,
  );
  const state = await loadStoredFavoriteState(storage);
  assert.equal(state.favorites[0].reference.entityId, 'segment-7');
  assert.equal(state.favorites[0].cachedItem, null);
});

test('loading corrupted JSON falls back to no favorites', async () => {
  const storage = createMemoryStorage();
  storage.data.set(FAVORITES_STORAGE_KEY, '[not valid json');

  assert.deepEqual(await loadStoredFavorites(storage), []);
});

test('loading with no stored value returns no favorites', async () => {
  const storage = createMemoryStorage();

  assert.deepEqual(await loadStoredFavorites(storage), []);
});

test('saving an empty list removes the stored key', async () => {
  const storage = createMemoryStorage();

  await saveFavorites([favorite('one')], storage);
  assert.equal(storage.data.has(FAVORITES_STORAGE_KEY), true);

  await saveFavorites([], storage);
  assert.equal(storage.data.has(FAVORITES_STORAGE_KEY), false);
});

test('clearStoredFavorites removes the stored key', async () => {
  const storage = createMemoryStorage();

  await saveFavorites([favorite('one')], storage);
  await clearStoredFavorites(storage);

  assert.equal(storage.data.has(FAVORITES_STORAGE_KEY), false);
  assert.deepEqual(await loadStoredFavorites(storage), []);
});
