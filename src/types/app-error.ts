export type AppErrorCategory =
  | 'validation'
  | 'network'
  | 'timeout'
  | 'rateLimit'
  | 'permission'
  | 'serviceUnavailable'
  | 'storage'
  | 'notFound'
  | 'conflict'
  | 'unknown';

export type AppErrorCode =
  | 'NETWORK_ERROR'
  | 'REQUEST_TIMEOUT'
  | 'RATE_LIMITED'
  | 'SERVICE_UNAVAILABLE'
  | 'PERMISSION_DENIED'
  | 'NOT_FOUND'
  | 'STORAGE_FAILED'
  | 'NAVIGATION_FAILED'
  | 'PARKING_DATA_FAILED'
  | 'PLACE_SEARCH_FAILED'
  | 'FAVORITE_PERSISTENCE_FAILED'
  | 'PREFERENCE_PERSISTENCE_FAILED'
  | 'ONBOARDING_PERSISTENCE_FAILED'
  | 'CANCELLED';

export type AppError = {
  code: AppErrorCode;
  category: AppErrorCategory;
  message: string;
  retryable: boolean;
  developerMessage?: string;
  cause?: unknown;
};

export type AppActionResult =
  | { ok: true }
  | { ok: false; error: AppError };
