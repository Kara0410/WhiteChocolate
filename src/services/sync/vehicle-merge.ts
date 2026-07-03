import type { Vehicle } from '@/types/vehicle';
import { normalizeLicensePlate } from '@/utils/vehicles';

import type { SyncConflict } from './sync-types';
import {
  isNonEmptyString,
  isRecord,
  parseTimestamp,
} from './sync-validation';

export type VehicleMergeOptions = {
  /** The local activeVehicleId, preserved across the merge where possible. */
  activeVehicleId?: string | null;
};

export type VehicleMergeResult = {
  vehicles: Vehicle[];
  activeVehicleId: string | null;
  /** Vehicles Phase 4B must upsert to user_vehicles (local-only + local conflict winners). */
  uploadedCandidates: Vehicle[];
  /** Vehicles that came from remote and are new to this device. */
  downloadedCandidates: Vehicle[];
  /** How many normalized plates existed on both sides. */
  mergedCount: number;
  conflicts: SyncConflict[];
};

type RemoteVehicle = {
  vehicle: Vehicle;
  isActive: boolean;
};

/**
 * Maps a user_vehicles row (unknown until validated) to the local Vehicle
 * shape. Returns null for malformed rows, which the merge silently drops —
 * a bad remote row must never corrupt local data.
 */
function normalizeRemoteVehicleRow(value: unknown): RemoteVehicle | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.nickname) ||
    !isNonEmptyString(value.license_plate)
  ) {
    return null;
  }

  // Prefer the original local creation time preserved through upload.
  const createdAt = isNonEmptyString(value.local_created_at)
    ? value.local_created_at
    : isNonEmptyString(value.created_at)
      ? value.created_at
      : null;

  if (createdAt === null) {
    return null;
  }

  const vehicle: Vehicle = {
    id: value.id,
    nickname: value.nickname.trim(),
    licensePlate: normalizeLicensePlate(value.license_plate),
    createdAt,
  };

  if (isNonEmptyString(value.updated_at)) {
    vehicle.updatedAt = value.updated_at;
  }

  return { vehicle, isActive: value.is_active === true };
}

/** Newer updatedAt wins only when both sides have one; otherwise local. */
function pickVehicleWinner(
  local: Vehicle,
  remote: Vehicle,
): 'local' | 'remote' {
  const localMs = parseTimestamp(local.updatedAt);
  const remoteMs = parseTimestamp(remote.updatedAt);

  if (localMs !== null && remoteMs !== null && remoteMs > localMs) {
    return 'remote';
  }

  return 'local';
}

/**
 * Pure merge of the local garage with user_vehicles rows. Never mutates its
 * inputs, never drops a local vehicle, and performs no I/O.
 *
 * Merge key: normalized license plate. When content differs on both sides,
 * the newer updatedAt wins if both have one, otherwise local wins. When
 * content is identical the local instance is kept so local ids (and the
 * active vehicle id) stay stable.
 */
export function mergeVehicles(
  localVehicles: readonly Vehicle[],
  remoteRows: readonly unknown[],
  options: VehicleMergeOptions = {},
): VehicleMergeResult {
  // Defensive local dedupe by plate; storage normally guarantees this.
  const localByPlate = new Map<string, Vehicle>();
  for (const vehicle of localVehicles) {
    const plate = normalizeLicensePlate(vehicle.licensePlate);
    if (!plate || localByPlate.has(plate)) {
      continue;
    }
    localByPlate.set(plate, vehicle);
  }

  const remoteByPlate = new Map<string, RemoteVehicle>();
  for (const row of remoteRows) {
    const remote = normalizeRemoteVehicleRow(row);
    if (!remote || remoteByPlate.has(remote.vehicle.licensePlate)) {
      continue;
    }
    remoteByPlate.set(remote.vehicle.licensePlate, remote);
  }

  const vehicles: Vehicle[] = [];
  const resultByPlate = new Map<string, Vehicle>();
  const uploadedCandidates: Vehicle[] = [];
  const downloadedCandidates: Vehicle[] = [];
  const conflicts: SyncConflict[] = [];
  let mergedCount = 0;

  const pushResult = (plate: string, vehicle: Vehicle) => {
    vehicles.push(vehicle);
    resultByPlate.set(plate, vehicle);
  };

  // Local order first, remote-only vehicles appended afterwards.
  for (const [plate, localVehicle] of localByPlate) {
    const remote = remoteByPlate.get(plate);

    if (!remote) {
      pushResult(plate, localVehicle);
      uploadedCandidates.push(localVehicle);
      continue;
    }

    mergedCount += 1;
    const contentsDiffer =
      localVehicle.nickname.trim() !== remote.vehicle.nickname;

    if (!contentsDiffer) {
      // Keep the local instance so local ids stay stable.
      pushResult(plate, localVehicle);
      continue;
    }

    const winner = pickVehicleWinner(localVehicle, remote.vehicle);
    conflicts.push({ domain: 'vehicles', key: plate, winner });

    if (winner === 'local') {
      pushResult(plate, localVehicle);
      uploadedCandidates.push(localVehicle);
    } else {
      pushResult(plate, remote.vehicle);
    }
  }

  for (const [plate, remote] of remoteByPlate) {
    if (localByPlate.has(plate)) {
      continue;
    }
    pushResult(plate, remote.vehicle);
    downloadedCandidates.push(remote.vehicle);
  }

  return {
    vehicles,
    activeVehicleId: resolveActiveVehicleId(
      options.activeVehicleId ?? null,
      localVehicles,
      remoteByPlate,
      resultByPlate,
      vehicles,
    ),
    uploadedCandidates,
    downloadedCandidates,
    mergedCount,
    conflicts,
  };
}

function resolveActiveVehicleId(
  requestedActiveId: string | null,
  localVehicles: readonly Vehicle[],
  remoteByPlate: ReadonlyMap<string, RemoteVehicle>,
  resultByPlate: ReadonlyMap<string, Vehicle>,
  vehicles: readonly Vehicle[],
): string | null {
  // Follow the local active vehicle's plate: if the remote version won the
  // conflict, the active id moves with it to the merged representative.
  if (requestedActiveId) {
    const activeLocal = localVehicles.find(
      (vehicle) => vehicle.id === requestedActiveId,
    );

    if (activeLocal) {
      const representative = resultByPlate.get(
        normalizeLicensePlate(activeLocal.licensePlate),
      );

      if (representative) {
        return representative.id;
      }
    }

    if (vehicles.some((vehicle) => vehicle.id === requestedActiveId)) {
      return requestedActiveId;
    }
  }

  // No usable local active vehicle: adopt the remote is_active flag.
  for (const remote of remoteByPlate.values()) {
    if (remote.isActive) {
      const representative = resultByPlate.get(remote.vehicle.licensePlate);

      if (representative) {
        return representative.id;
      }
    }
  }

  return vehicles[0]?.id ?? null;
}
