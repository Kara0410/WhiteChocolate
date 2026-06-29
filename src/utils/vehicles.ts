import type {
  Vehicle,
  VehicleFieldErrors,
  VehicleInput,
} from '@/types/vehicle';

export function normalizeLicensePlate(value: string) {
  return value.trim().replace(/\s+/g, ' ').toUpperCase();
}

export function normalizeVehicleInput(input: VehicleInput): VehicleInput {
  return {
    nickname: input.nickname.trim(),
    licensePlate: normalizeLicensePlate(input.licensePlate),
  };
}

export function validateVehicleInput(
  input: VehicleInput,
  vehicles: Vehicle[],
): {
  errors: VehicleFieldErrors;
  value: VehicleInput;
} {
  const value = normalizeVehicleInput(input);
  const errors: VehicleFieldErrors = {};

  if (!value.nickname) {
    errors.nickname = 'Nickname is required.';
  }

  if (!value.licensePlate) {
    errors.licensePlate = 'License plate is required.';
  } else if (
    vehicles.some(
      (vehicle) =>
        normalizeLicensePlate(vehicle.licensePlate) === value.licensePlate,
    )
  ) {
    errors.licensePlate = 'This license plate is already in your garage.';
  }

  return { errors, value };
}

export function addVehicleToState(
  vehicles: Vehicle[],
  activeVehicleId: string | null,
  vehicle: Vehicle,
) {
  return {
    vehicles: [...vehicles, vehicle],
    activeVehicleId: activeVehicleId ?? vehicle.id,
  };
}

export function setActiveVehicleInState(
  vehicles: Vehicle[],
  activeVehicleId: string | null,
  vehicleId: string,
) {
  return vehicles.some((vehicle) => vehicle.id === vehicleId)
    ? vehicleId
    : activeVehicleId;
}

export function removeVehicleFromState(
  vehicles: Vehicle[],
  activeVehicleId: string | null,
  vehicleId: string,
) {
  const remainingVehicles = vehicles.filter(
    (vehicle) => vehicle.id !== vehicleId,
  );
  const activeStillExists = remainingVehicles.some(
    (vehicle) => vehicle.id === activeVehicleId,
  );

  return {
    vehicles: remainingVehicles,
    activeVehicleId: activeStillExists
      ? activeVehicleId
      : (remainingVehicles[0]?.id ?? null),
  };
}
