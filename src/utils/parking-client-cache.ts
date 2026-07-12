import type { ParkingClusterResponse } from '@/types/parking-map';

const MAX_CLIENT_CACHE_ENTRIES = 80;

export type CachedParkingData = {
  clusters: ParkingClusterResponse[];
  spots: ParkingClusterResponse[];
};

const parkingCache = new Map<string, CachedParkingData>();
let cacheGeneration = 0;

export function getParkingCacheIdentity(
  tileKey: string,
  parkingZoneVersion: string,
) {
  return `${tileKey}:zones:${parkingZoneVersion}`;
}

export function getCachedParkingData(key: string) {
  return parkingCache.get(key) ?? null;
}

export function cacheParkingData(key: string, data: CachedParkingData) {
  parkingCache.delete(key);
  parkingCache.set(key, data);

  if (parkingCache.size > MAX_CLIENT_CACHE_ENTRIES) {
    const oldestKey = parkingCache.keys().next().value;
    if (oldestKey) {
      parkingCache.delete(oldestKey);
    }
  }
}

export function invalidateParkingCache(reason = 'manual') {
  const previousSize = parkingCache.size;
  parkingCache.clear();
  cacheGeneration += 1;

  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.debug('[parking-map] Parking cache invalidated.', {
      reason,
      previousSize,
      generation: cacheGeneration,
    });
  }
}

export function getParkingCacheStats() {
  return {
    generation: cacheGeneration,
    size: parkingCache.size,
  };
}

export function resetParkingCacheForTests() {
  parkingCache.clear();
  cacheGeneration = 0;
}
