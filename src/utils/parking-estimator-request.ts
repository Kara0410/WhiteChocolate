import type {
  ParkingBoundingBox,
  ParkingCoordinates,
  ParkingEstimateDestination,
} from '@/types/parking-domain';

export const PARKING_ESTIMATOR_TIMEZONE = 'Europe/Berlin' as const;

const BOUNDS_GRID_DEGREES = 0.002;
const MAX_BOUNDS_SPAN_METERS = 10_000;
const MAX_BOUNDS_AREA_SQUARE_METERS = 25_000_000;

export type ParkingEstimatorRequest = {
  bounds: ParkingBoundingBox;
  destination: ParkingEstimateDestination | null;
  origin: ParkingCoordinates | null;
  requestedAt: string;
  timezone: typeof PARKING_ESTIMATOR_TIMEZONE;
  includeTraffic: boolean;
};

export class ParkingEstimatorRequestError extends Error {
  constructor(
    public readonly code: 'INVALID_COORDINATES' | 'INVALID_BOUNDS' | 'BOUNDS_TOO_LARGE',
    message: string,
  ) {
    super(message);
    this.name = 'ParkingEstimatorRequestError';
  }
}

export type ParkingEstimatorErrorKind =
  | 'invalid-request'
  | 'area-too-large'
  | 'unauthorized'
  | 'timeout'
  | 'network'
  | 'server'
  | 'invalid-response';

export function parkingEstimatorUserMessage(kind: ParkingEstimatorErrorKind) {
  if (kind === 'area-too-large') {
    return 'The selected area is too large. Zoom in and try again.';
  }
  if (kind === 'invalid-request') {
    return 'Move closer to the destination and try again.';
  }
  return 'Parking availability could not be updated right now.';
}

function validCoordinates(value: ParkingCoordinates | null | undefined) {
  return value !== null && value !== undefined &&
    Number.isFinite(value.latitude) &&
    Number.isFinite(value.longitude) &&
    value.latitude >= -90 &&
    value.latitude <= 90 &&
    value.longitude >= -180 &&
    value.longitude <= 180;
}

export function normalizeParkingPlaceId(placeId: string | null | undefined) {
  const normalized = placeId?.trim();
  return normalized ? normalized : null;
}

function normalizeBounds(bounds: ParkingBoundingBox): ParkingBoundingBox {
  const normalized = {
    minLat:
      Math.floor(bounds.minLat / BOUNDS_GRID_DEGREES) * BOUNDS_GRID_DEGREES,
    minLng:
      Math.floor(bounds.minLng / BOUNDS_GRID_DEGREES) * BOUNDS_GRID_DEGREES,
    maxLat:
      Math.ceil(bounds.maxLat / BOUNDS_GRID_DEGREES) * BOUNDS_GRID_DEGREES,
    maxLng:
      Math.ceil(bounds.maxLng / BOUNDS_GRID_DEGREES) * BOUNDS_GRID_DEGREES,
  };
  if (
    !Number.isFinite(normalized.minLat) ||
    !Number.isFinite(normalized.minLng) ||
    !Number.isFinite(normalized.maxLat) ||
    !Number.isFinite(normalized.maxLng) ||
    normalized.minLat < -90 ||
    normalized.maxLat > 90 ||
    normalized.minLng < -180 ||
    normalized.maxLng > 180 ||
    normalized.minLat >= normalized.maxLat ||
    normalized.minLng >= normalized.maxLng
  ) {
    throw new ParkingEstimatorRequestError(
      'INVALID_BOUNDS',
      'Parking estimate bounds are invalid.',
    );
  }

  const middleLatitudeRadians =
    (((normalized.minLat + normalized.maxLat) / 2) * Math.PI) / 180;
  const heightMeters = (normalized.maxLat - normalized.minLat) * 111_320;
  const widthMeters =
    (normalized.maxLng - normalized.minLng) *
    111_320 *
    Math.max(0.01, Math.cos(middleLatitudeRadians));
  if (
    heightMeters > MAX_BOUNDS_SPAN_METERS ||
    widthMeters > MAX_BOUNDS_SPAN_METERS ||
    heightMeters * widthMeters > MAX_BOUNDS_AREA_SQUARE_METERS
  ) {
    throw new ParkingEstimatorRequestError(
      'BOUNDS_TOO_LARGE',
      'Parking estimate bounds are too large.',
    );
  }
  return normalized;
}

export function buildParkingEstimatorRequest(input: {
  bounds: ParkingBoundingBox;
  destination: ParkingEstimateDestination;
  origin?: ParkingCoordinates | null;
  includeTraffic?: boolean;
  requestedAt: Date;
}): ParkingEstimatorRequest {
  if (!validCoordinates(input.destination)) {
    throw new ParkingEstimatorRequestError(
      'INVALID_COORDINATES',
      'The selected destination has invalid coordinates.',
    );
  }
  const origin = validCoordinates(input.origin) ? input.origin! : null;
  if (!Number.isFinite(input.requestedAt.getTime())) {
    throw new ParkingEstimatorRequestError(
      'INVALID_COORDINATES',
      'The parking estimate timestamp is invalid.',
    );
  }
  return {
    bounds: normalizeBounds(input.bounds),
    destination: {
      latitude: input.destination.latitude,
      longitude: input.destination.longitude,
      placeId: normalizeParkingPlaceId(input.destination.placeId),
    },
    origin,
    requestedAt: input.requestedAt.toISOString(),
    timezone: PARKING_ESTIMATOR_TIMEZONE,
    includeTraffic: input.includeTraffic === true && origin !== null,
  };
}

export function parkingEstimatorRequestKey(request: ParkingEstimatorRequest) {
  return JSON.stringify(request);
}

export class ParkingEstimatorRequestCoordinator<T> {
  private readonly completed = new Map<string, { expiresAt: number; value: T }>();
  private readonly inFlight = new Map<string, Promise<T>>();

  constructor(
    private readonly cacheMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  run(key: string, operation: () => Promise<T>): Promise<T> {
    const cached = this.completed.get(key);
    if (cached && cached.expiresAt > this.now()) {
      return Promise.resolve(cached.value);
    }
    const current = this.inFlight.get(key);
    if (current) return current;

    const pending = operation()
      .then((value) => {
        this.completed.set(key, {
          expiresAt: this.now() + this.cacheMs,
          value,
        });
        if (this.completed.size > 16) {
          this.completed.delete(this.completed.keys().next().value!);
        }
        return value;
      })
      .finally(() => {
        this.inFlight.delete(key);
      });
    this.inFlight.set(key, pending);
    return pending;
  }
}

export class LatestParkingEstimatorRequest {
  private sequence = 0;

  begin() {
    this.sequence += 1;
    return this.sequence;
  }

  isCurrent(requestId: number) {
    return requestId === this.sequence;
  }

  invalidate() {
    this.sequence += 1;
  }
}
