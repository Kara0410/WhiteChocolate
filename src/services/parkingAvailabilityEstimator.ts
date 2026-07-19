import { supabase } from '@/lib/supabase';
import type {
  ParkingEstimateFactor,
} from '@/types/parking-domain';
import type { ParkingAvailabilityEstimateResult } from '@/utils/parking-estimates';
import {
  ParkingEstimatorRequestCoordinator,
  ParkingEstimatorRequestError,
  parkingEstimatorUserMessage,
  parkingEstimatorRequestKey,
  type ParkingEstimatorErrorKind,
  type ParkingEstimatorRequest,
} from '@/utils/parking-estimator-request';
export { mergeParkingAvailabilityEstimates } from '@/utils/parking-estimates';
export { buildParkingEstimatorRequest } from '@/utils/parking-estimator-request';

const ESTIMATOR_REQUEST_TIMEOUT_MS = 10_000;
const ESTIMATOR_CLIENT_CACHE_MS = 30_000;

const requestCoordinator =
  new ParkingEstimatorRequestCoordinator<ParkingAvailabilityEstimateResponse>(
    ESTIMATOR_CLIENT_CACHE_MS,
  );

export type ParkingEstimatorProviderStatus = {
  place: string;
  nearby: string;
  routes: string;
};

export type ParkingAvailabilityEstimateResponse = {
  contextHash: string;
  estimatorVersion: string;
  estimates: ParkingAvailabilityEstimateResult[];
  reusedCount: number;
  generatedCount: number;
  providerStatus: ParkingEstimatorProviderStatus;
};

export class ParkingEstimatorServiceError extends Error {
  constructor(
    public readonly kind: ParkingEstimatorErrorKind,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = 'ParkingEstimatorServiceError';
  }

  get userMessage() {
    return parkingEstimatorUserMessage(this.kind);
  }
}

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
  if (status === 'estimated' && availabilityPercent === null) {
    return null;
  }
  if (
    status === 'unknown' &&
    (availableSpaces !== null || availabilityPercent !== null)
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

function providerStatus(value: unknown): ParkingEstimatorProviderStatus | null {
  if (!isRecord(value)) return null;
  return typeof value.place === 'string' &&
    typeof value.nearby === 'string' &&
    typeof value.routes === 'string'
    ? { place: value.place, nearby: value.nearby, routes: value.routes }
    : null;
}

function errorStatus(error: unknown) {
  if (!isRecord(error) || !isRecord(error.context)) return null;
  return typeof error.context.status === 'number' ? error.context.status : null;
}

function serviceError(error: unknown): ParkingEstimatorServiceError {
  if (error instanceof ParkingEstimatorRequestError) {
    return new ParkingEstimatorServiceError(
      error.code === 'BOUNDS_TOO_LARGE' ? 'area-too-large' : 'invalid-request',
      error.message,
      { cause: error },
    );
  }
  const status = errorStatus(error);
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  if (status === 413) {
    return new ParkingEstimatorServiceError(
      'area-too-large',
      message,
      { cause: error },
    );
  }
  if (status === 401 || status === 403) {
    return new ParkingEstimatorServiceError(
      'unauthorized',
      message,
      { cause: error },
    );
  }
  if (lower.includes('timeout') || lower.includes('aborted')) {
    return new ParkingEstimatorServiceError(
      'timeout',
      message,
      { cause: error },
    );
  }
  if (lower.includes('network') || lower.includes('fetch')) {
    return new ParkingEstimatorServiceError(
      'network',
      message,
      { cause: error },
    );
  }
  return new ParkingEstimatorServiceError(
    'server',
    message,
    { cause: error },
  );
}

async function invokeEstimator(
  request: ParkingEstimatorRequest,
  signal?: AbortSignal,
): Promise<ParkingAvailabilityEstimateResponse> {
  const { data, error } = await supabase.functions.invoke(
    'estimate-parking-availability',
    {
      body: request,
      signal,
      timeout: ESTIMATOR_REQUEST_TIMEOUT_MS,
    },
  );
  if (error) {
    throw serviceError(error);
  }
  if (!isRecord(data) || data.ok !== true) {
    throw new ParkingEstimatorServiceError(
      'invalid-response',
      'Parking estimator returned an invalid response.',
    );
  }
  const contextHash =
    typeof data.contextHash === 'string' ? data.contextHash : null;
  const estimatorVersion =
    typeof data.estimatorVersion === 'string' ? data.estimatorVersion : null;
  const normalizedProviderStatus = providerStatus(data.providerStatus);
  if (
    contextHash === null ||
    estimatorVersion === null ||
    !Array.isArray(data.estimates) ||
    normalizedProviderStatus === null
  ) {
    throw new ParkingEstimatorServiceError(
      'invalid-response',
      'Parking estimator response is incomplete.',
    );
  }
  return {
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
    providerStatus: normalizedProviderStatus,
  };
}

export function requestParkingAvailabilityEstimates(
  request: ParkingEstimatorRequest,
  options?: { signal?: AbortSignal },
): Promise<ParkingAvailabilityEstimateResponse> {
  const key = parkingEstimatorRequestKey(request);
  return requestCoordinator.run(key, () =>
    invokeEstimator(request, options?.signal).catch((error) => {
      throw error instanceof ParkingEstimatorServiceError
        ? error
        : serviceError(error);
    }),
  );
}
