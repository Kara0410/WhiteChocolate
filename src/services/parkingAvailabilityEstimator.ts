import { supabase } from '@/lib/supabase';
import type {
  ParkingBoundingBox,
  ParkingCoordinates,
  ParkingEstimateDestination,
  ParkingEstimateFactor,
} from '@/types/parking-domain';
import type { ParkingAvailabilityEstimateResult } from '@/utils/parking-estimates';
export { mergeParkingAvailabilityEstimates } from '@/utils/parking-estimates';

const ESTIMATOR_REQUEST_TIMEOUT_MS = 10_000;
const ESTIMATOR_CLIENT_CACHE_MS = 30_000;
const ESTIMATOR_BOUNDS_GRID_DEGREES = 0.002;
const estimateCache = new Map<
  string,
  { expiresAt: number; response: ParkingAvailabilityEstimateResponse }
>();

export type ParkingAvailabilityEstimateResponse = {
  contextHash: string;
  estimatorVersion: string;
  estimates: ParkingAvailabilityEstimateResult[];
  reusedCount: number;
  generatedCount: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizedEstimate(value: unknown): ParkingAvailabilityEstimateResult | null {
  if (!isRecord(value)) return null;
  const status = value.status;
  const confidence = value.confidence;
  const segmentId = typeof value.segmentId === 'string' ? value.segmentId : null;
  const generatedAt = typeof value.generatedAt === 'string' ? value.generatedAt : null;
  const validUntil = typeof value.validUntil === 'string' ? value.validUntil : null;
  const estimatorVersion =
    typeof value.estimatorVersion === 'string' ? value.estimatorVersion : null;
  if (
    segmentId === null ||
    (status !== 'estimated' && status !== 'unknown') ||
    (confidence !== 'low' && confidence !== 'medium') ||
    generatedAt === null ||
    validUntil === null ||
    estimatorVersion === null
  ) {
    return null;
  }
  const availableSpaces =
    typeof value.availableSpaces === 'number' && value.availableSpaces >= 0
      ? value.availableSpaces
      : null;
  const availabilityPercent =
    typeof value.availabilityPercent === 'number' &&
    value.availabilityPercent >= 0 &&
    value.availabilityPercent <= 100
      ? value.availabilityPercent
      : null;
  if (
    status === 'estimated' &&
    (availableSpaces === null || availabilityPercent === null)
  ) {
    return null;
  }
  return {
    segmentId,
    availableSpaces: status === 'estimated' ? availableSpaces : null,
    availabilityPercent: status === 'estimated' ? availabilityPercent : null,
    status,
    confidence,
    generatedAt,
    validUntil,
    estimatorVersion,
    factors: Array.isArray(value.factors)
      ? (value.factors as ParkingEstimateFactor[])
      : [],
  };
}

export async function requestParkingAvailabilityEstimates(input: {
  bounds: ParkingBoundingBox;
  destination: ParkingEstimateDestination;
  origin?: ParkingCoordinates | null;
  includeTraffic?: boolean;
  requestedAt?: Date;
  signal?: AbortSignal;
}): Promise<ParkingAvailabilityEstimateResponse> {
  const requestBounds = {
    minLat:
      Math.floor(input.bounds.minLat / ESTIMATOR_BOUNDS_GRID_DEGREES) *
      ESTIMATOR_BOUNDS_GRID_DEGREES,
    minLng:
      Math.floor(input.bounds.minLng / ESTIMATOR_BOUNDS_GRID_DEGREES) *
      ESTIMATOR_BOUNDS_GRID_DEGREES,
    maxLat:
      Math.ceil(input.bounds.maxLat / ESTIMATOR_BOUNDS_GRID_DEGREES) *
      ESTIMATOR_BOUNDS_GRID_DEGREES,
    maxLng:
      Math.ceil(input.bounds.maxLng / ESTIMATOR_BOUNDS_GRID_DEGREES) *
      ESTIMATOR_BOUNDS_GRID_DEGREES,
  };
  const cacheKey = JSON.stringify({
    bounds: requestBounds,
    destination:
      input.destination.placeId ??
      [
        input.destination.latitude.toFixed(3),
        input.destination.longitude.toFixed(3),
      ],
    includeTraffic: input.includeTraffic ?? false,
    origin: input.origin
      ? [input.origin.latitude.toFixed(3), input.origin.longitude.toFixed(3)]
      : null,
  });
  const cached = estimateCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.response;

  const { data, error } = await supabase.functions.invoke(
    'estimate-parking-availability',
    {
      body: {
        bounds: {
          minLat: requestBounds.minLat,
          minLng: requestBounds.minLng,
          maxLat: requestBounds.maxLat,
          maxLng: requestBounds.maxLng,
        },
        destination: input.destination,
        origin: input.origin ?? null,
        requestedAt: (input.requestedAt ?? new Date()).toISOString(),
        timezone: 'Europe/Berlin',
        includeTraffic: input.includeTraffic ?? false,
      },
      signal: input.signal,
      timeout: ESTIMATOR_REQUEST_TIMEOUT_MS,
    },
  );
  if (error) {
    throw new Error('Unable to refresh parking estimates.');
  }
  if (!isRecord(data) || data.ok !== true) {
    throw new Error('Parking estimator returned an invalid response.');
  }
  const contextHash =
    typeof data.contextHash === 'string' ? data.contextHash : null;
  const estimatorVersion =
    typeof data.estimatorVersion === 'string' ? data.estimatorVersion : null;
  if (contextHash === null || estimatorVersion === null || !Array.isArray(data.estimates)) {
    throw new Error('Parking estimator response is incomplete.');
  }
  const response = {
    contextHash,
    estimatorVersion,
    estimates: data.estimates.flatMap((estimate) => {
      const normalized = normalizedEstimate(estimate);
      return normalized === null ? [] : [normalized];
    }),
    reusedCount:
      typeof data.reusedCount === 'number' ? data.reusedCount : 0,
    generatedCount:
      typeof data.generatedCount === 'number' ? data.generatedCount : 0,
  };
  estimateCache.set(cacheKey, {
    expiresAt: Date.now() + ESTIMATOR_CLIENT_CACHE_MS,
    response,
  });
  if (estimateCache.size > 16) {
    estimateCache.delete(estimateCache.keys().next().value!);
  }
  return response;
}
