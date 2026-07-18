import { PARKING_ESTIMATOR_TIME_ZONE } from './parking-estimator.ts';

export const MAX_ESTIMATION_SEGMENTS = 500;
export const MAX_BOUNDS_SPAN_METERS = 10_000;
export const MAX_BOUNDS_AREA_SQUARE_METERS = 25_000_000;

export type EstimateParkingBounds = {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
};

export type EstimateParkingCoordinates = {
  latitude: number;
  longitude: number;
};

export type EstimateParkingDestination = EstimateParkingCoordinates & {
  placeId: string | null;
};

export type EstimateParkingAvailabilityRequest = {
  bounds: EstimateParkingBounds;
  destination: EstimateParkingDestination | null;
  origin: EstimateParkingCoordinates | null;
  requestedAt: string;
  timezone: typeof PARKING_ESTIMATOR_TIME_ZONE;
  includeTraffic: boolean;
};

export class EstimateRequestError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = 'EstimateRequestError';
  }
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function finiteNumber(value: unknown, field: string) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new EstimateRequestError('INVALID_REQUEST', `${field} must be a finite number.`);
  }
  return value;
}

function coordinates(
  value: unknown,
  field: string,
): EstimateParkingCoordinates {
  const item = record(value);
  if (!item) {
    throw new EstimateRequestError('INVALID_REQUEST', `${field} must be an object.`);
  }
  const latitude = finiteNumber(item.latitude, `${field}.latitude`);
  const longitude = finiteNumber(item.longitude, `${field}.longitude`);
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new EstimateRequestError('INVALID_COORDINATES', `${field} contains invalid coordinates.`);
  }
  return { latitude, longitude };
}

function approximateBoundsSize(bounds: EstimateParkingBounds) {
  const middleLatitudeRadians =
    (((bounds.minLat + bounds.maxLat) / 2) * Math.PI) / 180;
  const heightMeters = (bounds.maxLat - bounds.minLat) * 111_320;
  const widthMeters =
    (bounds.maxLng - bounds.minLng) *
    111_320 *
    Math.max(0.01, Math.cos(middleLatitudeRadians));
  return {
    areaSquareMeters: heightMeters * widthMeters,
    heightMeters,
    widthMeters,
  };
}

export function parseEstimateParkingAvailabilityRequest(
  value: unknown,
): EstimateParkingAvailabilityRequest {
  const body = record(value);
  if (!body) {
    throw new EstimateRequestError('INVALID_REQUEST', 'Request body must be an object.');
  }
  const boundsValue = record(body.bounds);
  if (!boundsValue) {
    throw new EstimateRequestError('INVALID_BOUNDS', 'bounds must be an object.');
  }
  const bounds: EstimateParkingBounds = {
    minLat: finiteNumber(boundsValue.minLat, 'bounds.minLat'),
    minLng: finiteNumber(boundsValue.minLng, 'bounds.minLng'),
    maxLat: finiteNumber(boundsValue.maxLat, 'bounds.maxLat'),
    maxLng: finiteNumber(boundsValue.maxLng, 'bounds.maxLng'),
  };
  if (
    bounds.minLat < -90 ||
    bounds.maxLat > 90 ||
    bounds.minLng < -180 ||
    bounds.maxLng > 180 ||
    bounds.minLat >= bounds.maxLat ||
    bounds.minLng >= bounds.maxLng
  ) {
    throw new EstimateRequestError('INVALID_BOUNDS', 'bounds are invalid.');
  }
  const size = approximateBoundsSize(bounds);
  if (
    size.widthMeters > MAX_BOUNDS_SPAN_METERS ||
    size.heightMeters > MAX_BOUNDS_SPAN_METERS ||
    size.areaSquareMeters > MAX_BOUNDS_AREA_SQUARE_METERS
  ) {
    throw new EstimateRequestError(
      'BOUNDS_TOO_LARGE',
      'Requested parking bounds are too large.',
      413,
    );
  }

  const requestedAt = body.requestedAt;
  if (typeof requestedAt !== 'string' || !Number.isFinite(Date.parse(requestedAt))) {
    throw new EstimateRequestError('INVALID_REQUESTED_AT', 'requestedAt must be an ISO date-time.');
  }
  if (body.timezone !== PARKING_ESTIMATOR_TIME_ZONE) {
    throw new EstimateRequestError(
      'UNSUPPORTED_TIMEZONE',
      `timezone must be ${PARKING_ESTIMATOR_TIME_ZONE}.`,
    );
  }

  let destination: EstimateParkingDestination | null = null;
  if (body.destination !== null && body.destination !== undefined) {
    const destinationValue = record(body.destination);
    const parsed = coordinates(body.destination, 'destination');
    const placeId = destinationValue?.placeId;
    if (placeId !== null && placeId !== undefined && typeof placeId !== 'string') {
      throw new EstimateRequestError('INVALID_REQUEST', 'destination.placeId must be a string or null.');
    }
    destination = {
      ...parsed,
      placeId: typeof placeId === 'string' && placeId.trim() ? placeId.trim() : null,
    };
  }

  const origin =
    body.origin === null || body.origin === undefined
      ? null
      : coordinates(body.origin, 'origin');
  if (typeof body.includeTraffic !== 'boolean') {
    throw new EstimateRequestError('INVALID_REQUEST', 'includeTraffic must be a boolean.');
  }

  return {
    bounds,
    destination,
    origin,
    requestedAt: new Date(requestedAt).toISOString(),
    timezone: PARKING_ESTIMATOR_TIME_ZONE,
    includeTraffic: body.includeTraffic,
  };
}
