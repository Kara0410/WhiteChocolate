import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  AvailabilityColorStatus,
  ParkingBestSpot,
  ParkingClusterResponse,
  WalkingCategory,
} from '@/types/parking-map';
import type { KeyValueStorage } from '@/types/storage';

export const FAVORITES_STORAGE_KEY = '@white-choclate/favorites/v1';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isColorStatus(value: unknown): value is AvailabilityColorStatus {
  return value === 'green' || value === 'orange' || value === 'red';
}

function isWalkingCategory(value: unknown): value is WalkingCategory {
  return value === 'close' || value === 'acceptable' || value === 'far';
}

function toNullablePrice(value: unknown): number | null {
  return isFiniteNumber(value) ? value : null;
}

function normalizeStoredBestSpot(value: unknown): ParkingBestSpot | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    !isNonEmptyString(value.id) ||
    typeof value.zoneName !== 'string' ||
    !isFiniteNumber(value.availableSpots) ||
    !isFiniteNumber(value.availabilityPercent)
  ) {
    return null;
  }

  return {
    id: value.id,
    zoneName: value.zoneName,
    availableSpots: value.availableSpots,
    availabilityPercent: value.availabilityPercent,
    pricePerHour: toNullablePrice(value.pricePerHour),
  };
}

function normalizeStoredFavorite(
  value: unknown,
): ParkingClusterResponse | null {
  if (!isRecord(value)) {
    return null;
  }

  const bestSpot = normalizeStoredBestSpot(value.bestSpot);

  if (
    !isNonEmptyString(value.id) ||
    (value.type !== 'cluster' && value.type !== 'spot') ||
    !isFiniteNumber(value.latitude) ||
    !isFiniteNumber(value.longitude) ||
    !isFiniteNumber(value.availabilityPercent) ||
    !isFiniteNumber(value.count) ||
    !isFiniteNumber(value.totalCapacity) ||
    !isFiniteNumber(value.availableSpots) ||
    !isColorStatus(value.colorStatus) ||
    bestSpot === null
  ) {
    return null;
  }

  const favorite: ParkingClusterResponse = {
    id: value.id,
    type: value.type,
    latitude: value.latitude,
    longitude: value.longitude,
    availabilityPercent: value.availabilityPercent,
    count: value.count,
    totalCapacity: value.totalCapacity,
    availableSpots: value.availableSpots,
    colorStatus: value.colorStatus,
    minPrice: toNullablePrice(value.minPrice),
    avgPrice: toNullablePrice(value.avgPrice),
    bestSpot,
  };

  if (isFiniteNumber(value.zoneCount)) {
    favorite.zoneCount = value.zoneCount;
  }

  if (isFiniteNumber(value.spotCount)) {
    favorite.spotCount = value.spotCount;
  }

  if (typeof value.zoneId === 'string' || value.zoneId === null) {
    favorite.zoneId = value.zoneId;
  }

  if (typeof value.zoneName === 'string' || value.zoneName === null) {
    favorite.zoneName = value.zoneName;
  }

  if (isFiniteNumber(value.expansionZoom)) {
    favorite.expansionZoom = value.expansionZoom;
  }

  if (isFiniteNumber(value.distanceToDestination)) {
    favorite.distanceToDestination = value.distanceToDestination;
  }

  if (isWalkingCategory(value.walkingCategory)) {
    favorite.walkingCategory = value.walkingCategory;
  }

  return favorite;
}

export function normalizeStoredFavorites(
  value: unknown,
): ParkingClusterResponse[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const favorites: ParkingClusterResponse[] = [];
  const seenIds = new Set<string>();

  for (const entry of value) {
    const favorite = normalizeStoredFavorite(entry);

    if (!favorite || seenIds.has(favorite.id)) {
      continue;
    }

    seenIds.add(favorite.id);
    favorites.push(favorite);
  }

  return favorites;
}

export async function loadStoredFavorites(
  storage: KeyValueStorage = AsyncStorage,
): Promise<ParkingClusterResponse[]> {
  const storedValue = await storage.getItem(FAVORITES_STORAGE_KEY);

  if (storedValue === null) {
    return [];
  }

  let parsedValue: unknown;
  try {
    parsedValue = JSON.parse(storedValue);
  } catch {
    return [];
  }

  return normalizeStoredFavorites(parsedValue);
}

export async function saveFavorites(
  favorites: ParkingClusterResponse[],
  storage: KeyValueStorage = AsyncStorage,
): Promise<void> {
  // An empty list is stored as an absent key so "Delete local data"
  // leaves nothing behind in AsyncStorage.
  if (favorites.length === 0) {
    await storage.removeItem(FAVORITES_STORAGE_KEY);
    return;
  }

  await storage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
}

export async function clearStoredFavorites(
  storage: KeyValueStorage = AsyncStorage,
): Promise<void> {
  await storage.removeItem(FAVORITES_STORAGE_KEY);
}
