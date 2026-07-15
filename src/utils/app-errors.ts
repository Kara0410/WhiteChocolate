import type {
  AppError,
  AppErrorCategory,
  AppErrorCode,
} from '@/types/app-error';

export type AppErrorOperation =
  | 'place-search'
  | 'place-details'
  | 'parking-data'
  | 'parking-details'
  | 'favorite-hydration'
  | 'favorite-save'
  | 'favorite-refresh'
  | 'favorite-clear'
  | 'preference-load'
  | 'preference-save'
  | 'onboarding-save'
  | 'navigation'
  | 'sharing'
  | 'location';

function getRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function getDeveloperMessage(cause: unknown) {
  if (cause instanceof Error) {
    return cause.message;
  }

  const record = getRecord(cause);
  if (typeof record?.message === 'string') {
    return record.message;
  }

  return typeof cause === 'string' ? cause : 'Unknown application error';
}

function isAbortError(cause: unknown) {
  const record = getRecord(cause);
  return (
    record?.name === 'AbortError' ||
    record?.code === 'ABORT_ERR' ||
    getDeveloperMessage(cause).toLowerCase().includes('aborted')
  );
}

function hasAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function createAppError(
  code: AppErrorCode,
  category: AppErrorCategory,
  message: string,
  cause: unknown,
  retryable: boolean,
): AppError {
  return {
    code,
    category,
    message,
    retryable,
    developerMessage: getDeveloperMessage(cause),
    cause,
  };
}

export function normalizeAppError(
  cause: unknown,
  operation: AppErrorOperation,
): AppError {
  const developerMessage = getDeveloperMessage(cause);
  const lowerMessage = developerMessage.toLowerCase();
  const record = getRecord(cause);
  const sourceCode =
    typeof record?.code === 'string' ? record.code.toLowerCase() : '';
  const status = typeof record?.status === 'number' ? record.status : null;

  if (isAbortError(cause)) {
    return createAppError(
      'CANCELLED',
      'unknown',
      '',
      cause,
      false,
    );
  }

  if (
    hasAny(lowerMessage, [
      'timeout',
      'timed out',
      'deadline exceeded',
    ]) || sourceCode.includes('timeout')
  ) {
    return createAppError(
      'REQUEST_TIMEOUT',
      'timeout',
      operation === 'place-search' || operation === 'place-details'
        ? 'Search is taking longer than expected. Please try again.'
        : operation === 'location'
          ? 'We couldn\'t get your location. Try again or search for an address.'
          : 'This is taking longer than expected. Please try again.',
      cause,
      true,
    );
  }

  if (
    status === 429 ||
    hasAny(`${sourceCode} ${lowerMessage}`, [
      'rate limit',
      'too many requests',
      'quota',
      'resource_exhausted',
      'over_request_rate_limit',
    ])
  ) {
    return createAppError(
      'RATE_LIMITED',
      'rateLimit',
      operation === 'place-search' || operation === 'place-details'
        ? 'Search is temporarily busy. Please try again later.'
        : 'Too many attempts. Wait a few minutes and try again.',
      cause,
      true,
    );
  }

  if (
    status === 401 ||
    status === 403 ||
    hasAny(`${sourceCode} ${lowerMessage}`, [
      'permission_denied',
      'request_denied',
      'api key',
      'not authorized',
      'unauthorized',
      'forbidden',
    ])
  ) {
    return createAppError(
      'SERVICE_UNAVAILABLE',
      'serviceUnavailable',
      operation === 'place-search' || operation === 'place-details'
        ? 'Search is temporarily unavailable.'
        : operation === 'parking-data' || operation === 'parking-details'
          ? 'Parking information couldn\'t be loaded. Try again.'
          : 'This service is temporarily unavailable. Please try again.',
      cause,
      true,
    );
  }

  if (
    hasAny(lowerMessage, [
      'network request failed',
      'failed to fetch',
      'fetch failed',
      'network error',
      'offline',
      'connection',
    ])
  ) {
    return createAppError(
      'NETWORK_ERROR',
      'network',
      operation === 'place-search' || operation === 'place-details'
        ? 'Search is unavailable right now. Check your connection and try again.'
        : operation === 'parking-data' || operation === 'parking-details'
          ? 'Parking information couldn\'t be loaded. Try again.'
          : 'We couldn\'t connect. Check your internet connection and try again.',
      cause,
      true,
    );
  }

  if (operation === 'navigation') {
    return createAppError(
      'NAVIGATION_FAILED',
      'serviceUnavailable',
      'Navigation couldn\'t be opened. Please try again or choose another maps app.',
      cause,
      true,
    );
  }

  if (operation === 'sharing') {
    return createAppError(
      'SERVICE_UNAVAILABLE',
      'serviceUnavailable',
      'Sharing couldn\'t be opened. Please try again.',
      cause,
      true,
    );
  }

  if (operation === 'place-search' || operation === 'place-details') {
    return createAppError(
      'PLACE_SEARCH_FAILED',
      'serviceUnavailable',
      'Search is temporarily unavailable.',
      cause,
      true,
    );
  }

  if (operation === 'parking-data' || operation === 'parking-details') {
    return createAppError(
      'PARKING_DATA_FAILED',
      'serviceUnavailable',
      'Parking information couldn\'t be loaded. Try again.',
      cause,
      true,
    );
  }

  const isStorageOperation = operation.includes('favorite') ||
    operation.includes('preference') ||
    operation.includes('onboarding');
  return createAppError(
    isStorageOperation
      ? operation === 'favorite-save' || operation === 'favorite-clear'
        ? 'FAVORITE_PERSISTENCE_FAILED'
        : operation.includes('preference')
          ? 'PREFERENCE_PERSISTENCE_FAILED'
          : 'ONBOARDING_PERSISTENCE_FAILED'
      : 'SERVICE_UNAVAILABLE',
    isStorageOperation ? 'storage' : 'unknown',
    operation === 'favorite-refresh'
      ? 'Favorites couldn\'t be refreshed. Your saved data is still available.'
      : operation === 'favorite-save'
        ? 'Your favorite could not be saved. Please try again.'
        : operation === 'favorite-clear'
          ? 'Favorites could not be cleared. Please try again.'
          : operation.includes('preference')
            ? 'That preference could not be saved. Please try again.'
            : operation.includes('onboarding')
              ? 'Your setup could not be saved. Please try again.'
              : 'This action is temporarily unavailable. Please try again.',
    cause,
    true,
  );
}

export function logAppError(
  operation: AppErrorOperation,
  cause: unknown,
  context?: Record<string, unknown>,
) {
  if (typeof __DEV__ === 'undefined' || !__DEV__) {
    return;
  }

  const normalized = normalizeAppError(cause, operation);
  if (normalized.code === 'CANCELLED') {
    return;
  }

  console.warn(`[AppError] ${operation} failed`, {
    ...context,
    code: normalized.code,
    developerMessage: normalized.developerMessage,
  });
}
