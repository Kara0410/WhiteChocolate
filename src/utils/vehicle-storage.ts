import AsyncStorage from '@react-native-async-storage/async-storage';

import type { KeyValueStorage } from '@/types/storage';
import type { Vehicle } from '@/types/vehicle';
import { normalizeLicensePlate } from '@/utils/vehicles';

export const VEHICLES_STORAGE_KEY = '@white-choclate/vehicles/v1';

export type StoredVehicleState = {
  activeVehicleId: string | null;
  vehicles: Vehicle[];
};

export const EMPTY_VEHICLE_STATE: StoredVehicleState = {
  activeVehicleId: null,
  vehicles: [],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeStoredVehicle(value: unknown): Vehicle | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.nickname) ||
    !isNonEmptyString(value.licensePlate) ||
    !isNonEmptyString(value.createdAt)
  ) {
    return null;
  }

  const vehicle: Vehicle = {
    id: value.id,
    nickname: value.nickname.trim(),
    licensePlate: normalizeLicensePlate(value.licensePlate),
    createdAt: value.createdAt,
  };

  if (isNonEmptyString(value.updatedAt)) {
    vehicle.updatedAt = value.updatedAt;
  }

  return vehicle;
}

export function normalizeStoredVehicleState(
  value: unknown,
): StoredVehicleState {
  if (!isRecord(value) || !Array.isArray(value.vehicles)) {
    return EMPTY_VEHICLE_STATE;
  }

  const vehicles: Vehicle[] = [];
  const seenIds = new Set<string>();
  const seenPlates = new Set<string>();

  for (const entry of value.vehicles) {
    const vehicle = normalizeStoredVehicle(entry);

    if (
      !vehicle ||
      seenIds.has(vehicle.id) ||
      seenPlates.has(vehicle.licensePlate)
    ) {
      continue;
    }

    seenIds.add(vehicle.id);
    seenPlates.add(vehicle.licensePlate);
    vehicles.push(vehicle);
  }

  const activeVehicleId =
    typeof value.activeVehicleId === 'string' &&
    seenIds.has(value.activeVehicleId)
      ? value.activeVehicleId
      : (vehicles[0]?.id ?? null);

  return { activeVehicleId, vehicles };
}

export async function loadStoredVehicleState(
  storage: KeyValueStorage = AsyncStorage,
): Promise<StoredVehicleState> {
  const storedValue = await storage.getItem(VEHICLES_STORAGE_KEY);

  if (storedValue === null) {
    return EMPTY_VEHICLE_STATE;
  }

  let parsedValue: unknown;
  try {
    parsedValue = JSON.parse(storedValue);
  } catch {
    return EMPTY_VEHICLE_STATE;
  }

  return normalizeStoredVehicleState(parsedValue);
}

export async function saveVehicleState(
  state: StoredVehicleState,
  storage: KeyValueStorage = AsyncStorage,
): Promise<void> {
  // An empty garage is stored as an absent key so "Delete local data"
  // leaves nothing behind in AsyncStorage.
  if (state.vehicles.length === 0) {
    await storage.removeItem(VEHICLES_STORAGE_KEY);
    return;
  }

  await storage.setItem(
    VEHICLES_STORAGE_KEY,
    JSON.stringify({
      activeVehicleId: state.activeVehicleId,
      vehicles: state.vehicles,
    }),
  );
}

export async function clearStoredVehicles(
  storage: KeyValueStorage = AsyncStorage,
): Promise<void> {
  await storage.removeItem(VEHICLES_STORAGE_KEY);
}
