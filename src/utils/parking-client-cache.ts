import { parkingMapDataCache } from '@/utils/parking-map-data-cache';

/** Clears public parking projections when app-level session state changes. */
export function invalidateParkingCache() {
  parkingMapDataCache.clear();
}
