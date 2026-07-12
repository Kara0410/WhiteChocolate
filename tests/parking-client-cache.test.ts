import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

import {
  cacheParkingData,
  getCachedParkingData,
  getParkingCacheIdentity,
  getParkingCacheStats,
  invalidateParkingCache,
  resetParkingCacheForTests,
} from '../src/utils/parking-client-cache';
import type { ParkingClusterResponse } from '../src/types/parking-map';

const emptyParkingData = {
  clusters: [] as ParkingClusterResponse[],
  spots: [] as ParkingClusterResponse[],
};

afterEach(() => {
  resetParkingCacheForTests();
});

test('creates cache identity from public request shape without auth identity', () => {
  assert.equal(
    getParkingCacheIdentity('parking:tile:11:48', 'none'),
    'parking:tile:11:48:zones:none',
  );
});

test('stores and invalidates cached parking data on auth transition', () => {
  const key = getParkingCacheIdentity('parking:tile:11:48', 'none');
  cacheParkingData(key, emptyParkingData);

  assert.equal(getCachedParkingData(key), emptyParkingData);
  assert.deepEqual(getParkingCacheStats(), {
    generation: 0,
    size: 1,
  });

  invalidateParkingCache('auth-state-change');

  assert.equal(getCachedParkingData(key), null);
  assert.deepEqual(getParkingCacheStats(), {
    generation: 1,
    size: 0,
  });
});

test('evicts the oldest parking cache entry when capacity is exceeded', () => {
  for (let index = 0; index < 81; index += 1) {
    cacheParkingData(`key-${index}`, emptyParkingData);
  }

  assert.equal(getCachedParkingData('key-0'), null);
  assert.equal(getCachedParkingData('key-80'), emptyParkingData);
  assert.equal(getParkingCacheStats().size, 80);
});
