import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  AvailabilityColorStatus,
  ParkingBestSpot,
  ParkingClusterResponse,
  WalkingCategory,
} from '@/types/parking-map';
import type { FavoriteParkingReference } from '@/types/parking-domain';
import type { KeyValueStorage } from '@/types/storage';

export const FAVORITES_STORAGE_KEY = '@white-choclate/favorites/v1';

export type StoredFavoriteParkingItem = {
  reference: FavoriteParkingReference;
  cachedItem: ParkingClusterResponse | null;
};

export type StoredFavoriteParkingState = {
  version: 3;
  favorites: StoredFavoriteParkingItem[];
};

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
    typeof value.label !== 'string' ||
    !isFiniteNumber(value.availableSpots) ||
    !isFiniteNumber(value.availabilityPercent)
  ) {
    return null;
  }

  return {
    id: value.id,
    label: value.label,
    availableSpots: value.availableSpots,
    availabilityPercent: value.availabilityPercent,
    pricePerHour: toNullablePrice(value.pricePerHour),
  };
}

export function normalizeStoredFavorite(
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

  if (
    value.availabilityStatus === 'estimated' ||
    value.availabilityStatus === 'unknown' ||
    value.availabilityStatus === 'mixed'
  ) {
    favorite.availabilityStatus = value.availabilityStatus;
  }

  if (
    value.pricingStatus === 'free' ||
    value.pricingStatus === 'paid' ||
    value.pricingStatus === 'unknown'
  ) {
    favorite.pricingStatus = value.pricingStatus;
  }

  if (isFiniteNumber(value.spotCount)) {
    favorite.spotCount = value.spotCount;
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

function normalizeReference(value: unknown): FavoriteParkingReference | null {
  if (!isRecord(value) || !isNonEmptyString(value.entityId)) {
    return null;
  }
  if (value.entityType !== 'segment' && value.entityType !== 'facility') {
    return null;
  }
  return {
    entityId: value.entityId,
    entityType: value.entityType,
    createdAt: isNonEmptyString(value.createdAt)
      ? value.createdAt
      : new Date(0).toISOString(),
  };
}

export function normalizeStoredFavoriteState(
  value: unknown,
): StoredFavoriteParkingState {
  const entries =
    isRecord(value) &&
    (value.version === 2 || value.version === 3) &&
    Array.isArray(value.favorites)
      ? value.favorites
      : Array.isArray(value)
        ? value
        : [];
  const favorites: StoredFavoriteParkingItem[] = [];
  const seenIds = new Set<string>();

  for (const entry of entries) {
    const explicitReference = isRecord(entry)
      ? normalizeReference(entry.reference)
      : null;
    const cachedItem =
      explicitReference && isRecord(value) && value.version === 3
        ? normalizeStoredFavorite(isRecord(entry) ? entry.cachedItem : null)
        : explicitReference
          ? null
          : normalizeStoredFavorite(entry);
    const reference =
      explicitReference ??
      (cachedItem
        ? {
            entityId: cachedItem.id,
            entityType: 'segment' as const,
            createdAt: new Date(0).toISOString(),
          }
        : null);
    if (reference === null || seenIds.has(reference.entityId)) {
      continue;
    }
    seenIds.add(reference.entityId);
    favorites.push({ reference, cachedItem });
  }

  return { version: 3, favorites };
}

export async function loadStoredFavoriteState(
  storage: KeyValueStorage = AsyncStorage,
): Promise<StoredFavoriteParkingState> {
  const storedValue = await storage.getItem(FAVORITES_STORAGE_KEY);
  if (storedValue === null) {
    return { version: 3, favorites: [] };
  }
  try {
    return normalizeStoredFavoriteState(JSON.parse(storedValue));
  } catch {
    return { version: 3, favorites: [] };
  }
}

export async function loadStoredFavorites(
  storage: KeyValueStorage = AsyncStorage,
): Promise<ParkingClusterResponse[]> {
  const state = await loadStoredFavoriteState(storage);
  return state.favorites.flatMap(({ cachedItem }) =>
    cachedItem === null ? [] : [cachedItem],
  );
}

export async function saveFavoriteState(
  state: StoredFavoriteParkingState,
  storage: KeyValueStorage = AsyncStorage,
): Promise<void> {
  if (state.favorites.length === 0) {
    await storage.removeItem(FAVORITES_STORAGE_KEY);
    return;
  }
  await storage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(state));
}

export async function saveFavorites(
  favorites: ParkingClusterResponse[],
  storage: KeyValueStorage = AsyncStorage,
): Promise<void> {
  await saveFavoriteState(
    {
      version: 3,
      favorites: favorites.map((favorite) => ({
        reference: {
          entityId: favorite.id,
          entityType: 'segment',
          createdAt: new Date(0).toISOString(),
        },
        cachedItem: favorite,
      })),
    },
    storage,
  );
}

export async function clearStoredFavorites(
  storage: KeyValueStorage = AsyncStorage,
): Promise<void> {
  await storage.removeItem(FAVORITES_STORAGE_KEY);
}
