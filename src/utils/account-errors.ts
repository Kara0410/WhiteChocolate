import {
  isAuthApiError,
  isAuthError,
  isAuthRetryableFetchError,
} from '@supabase/supabase-js';

import type {
  AccountError,
  AccountErrorCategory,
  AccountErrorCode,
} from '@/types/account';
import type { PreferencesError } from '@/types/preferences';

type AuthFailureOperation =
  | 'login'
  | 'signup'
  | 'oauth'
  | 'session'
  | 'logout'
  | 'password-reset'
  | 'password-recovery'
  | 'password-update'
  | 'delete';

type NormalizedAuthFailure = {
  category: AccountErrorCategory;
  code: AccountErrorCode;
  developerMessage: string;
  message: string;
  retryable: boolean;
  sourceCode: string | null;
  status: number | null;
};

export function createAccountError(
  code: AccountErrorCode,
  message: string,
  cause?: unknown,
  options?: {
    category?: AccountErrorCategory;
    developerMessage?: string;
    retryable?: boolean;
    sourceCode?: string | null;
    status?: number | null;
  },
): AccountError {
  return {
    code,
    message,
    cause,
    category: options?.category,
    developerMessage: options?.developerMessage,
    retryable: options?.retryable,
    sourceCode: options?.sourceCode,
    status: options?.status,
  };
}

function unknownRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function stringField(value: unknown) {
  return typeof value === 'string' ? value : null;
}

function numberField(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : null;
}

function getErrorName(cause: unknown) {
  const record = unknownRecord(cause);
  return stringField(record?.name) ?? 'Error';
}

function getSourceCode(cause: unknown) {
  const record = unknownRecord(cause);
  return stringField(record?.code)?.toLowerCase() ?? null;
}

function getStatus(cause: unknown) {
  const record = unknownRecord(cause);
  return numberField(record?.status);
}

function getSafeDeveloperMessage(cause: unknown) {
  if (cause instanceof Error) {
    return cause.message;
  }

  const record = unknownRecord(cause);
  return (
    stringField(record?.message) ??
    stringField(record?.error_description) ??
    'Unknown account service error'
  );
}

function authErrorMatches(cause: unknown, terms: string[]) {
  const code = getSourceCode(cause) ?? '';
  const message = getSafeDeveloperMessage(cause).toLowerCase();

  return terms.some((term) => code.includes(term) || message.includes(term));
}

function weakPasswordMessage(cause: unknown) {
  // Supabase's `reasons` array is developer-facing and can contain backend
  // policy details. Keep it in diagnostics, never in the user-facing copy.
  void cause;
  return 'Use a password with at least 8 characters.';
}

export function normalizeAuthFailure(
  cause: unknown,
  operation: AuthFailureOperation,
): NormalizedAuthFailure {
  const sourceCode = getSourceCode(cause);
  const status = getStatus(cause);
  const developerMessage = getSafeDeveloperMessage(cause);
  const lowerMessage = developerMessage.toLowerCase();

  if (sourceCode === 'request_timeout' || lowerMessage.includes('timeout')) {
    return {
      category: 'timeout',
      code: 'REQUEST_TIMEOUT',
      developerMessage,
      message: 'This is taking longer than expected. Please try again.',
      retryable: true,
      sourceCode,
      status,
    };
  }

  if (
    isAuthRetryableFetchError(cause) ||
    authErrorMatches(cause, ['network', 'fetch failed', 'failed to fetch'])
  ) {
    return {
      category: 'network',
      code: 'NETWORK_ERROR',
      developerMessage,
      message:
        "We couldn't connect. Check your internet connection and try again.",
      retryable: true,
      sourceCode,
      status,
    };
  }

  switch (sourceCode) {
    case 'email_exists':
    case 'user_already_exists':
      return {
        category: 'auth',
        code: 'ACCOUNT_EXISTS',
        developerMessage,
        message: 'An account with this email already exists. Sign in instead.',
        retryable: false,
        sourceCode,
        status,
      };
    case 'weak_password':
      return {
        category: 'validation',
        code: 'WEAK_PASSWORD',
        developerMessage,
        message: weakPasswordMessage(cause),
        retryable: false,
        sourceCode,
        status,
      };
    case 'email_address_invalid':
      return {
        category: 'validation',
        code: 'INVALID_EMAIL',
        developerMessage,
        message: 'Enter a valid email address.',
        retryable: false,
        sourceCode,
        status,
      };
    case 'email_address_not_authorized':
      return {
        category: 'configuration',
        code: 'EMAIL_NOT_AUTHORIZED',
        developerMessage,
        message: 'This email cannot currently receive account messages.',
        retryable: false,
        sourceCode,
        status,
      };
    case 'signup_disabled':
      return {
        category: 'configuration',
        code: 'SIGNUP_DISABLED',
        developerMessage,
        message: 'Account creation is temporarily unavailable.',
        retryable: false,
        sourceCode,
        status,
      };
    case 'email_provider_disabled':
      return {
        category: 'configuration',
        code: 'EMAIL_PROVIDER_DISABLED',
        developerMessage,
        message: 'Account creation is temporarily unavailable.',
        retryable: false,
        sourceCode,
        status,
      };
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return {
        category: 'rateLimit',
        code: 'RATE_LIMITED',
        developerMessage,
        message: 'Too many attempts. Wait a few minutes and try again.',
        retryable: true,
        sourceCode,
        status,
      };
    case 'captcha_failed':
      return {
        category: 'auth',
        code: 'REGISTER_FAILED',
        developerMessage,
        message: 'Account creation is temporarily unavailable.',
        retryable: true,
        sourceCode,
        status,
      };
    case 'unexpected_failure':
      return {
        category: operation === 'signup' ? 'database' : 'auth',
        code: operation === 'signup' ? 'DATABASE_FAILURE' : 'UNKNOWN_AUTH_ERROR',
        developerMessage,
        message:
          operation === 'signup'
            ? "We couldn't create your account right now. Please try again."
            : operation === 'login'
              ? "We couldn't sign you in right now. Please try again."
              : 'The account action could not be completed. Please try again.',
        retryable: true,
        sourceCode,
        status,
      };
  }

  if (
    operation === 'login' &&
    authErrorMatches(cause, ['invalid_credentials', 'invalid login'])
  ) {
    return {
      category: 'auth',
      code: 'LOGIN_FAILED',
      developerMessage,
      message: 'The email or password is incorrect.',
      retryable: false,
      sourceCode,
      status,
    };
  }

  if (
    operation === 'signup' &&
    authErrorMatches(cause, ['already registered', 'already exists'])
  ) {
    return {
      category: 'auth',
      code: 'ACCOUNT_EXISTS',
      developerMessage,
      message: 'An account with this email already exists. Sign in instead.',
      retryable: false,
      sourceCode,
      status,
    };
  }

  if (
    operation === 'password-recovery' &&
    authErrorMatches(cause, [
      'expired',
      'invalid token',
      'invalid_token',
      'invalid refresh token',
      'otp_expired',
      'otp_not_found',
      'refresh token not found',
      'refresh_token_not_found',
      'session not found',
    ])
  ) {
    return {
      category: 'auth',
      code: 'PASSWORD_RECOVERY_LINK_EXPIRED',
      developerMessage,
      message:
        'This password reset link is invalid or has expired. Request a new one.',
      retryable: false,
      sourceCode,
      status,
    };
  }

  const isSupabaseAuthFailure =
    isAuthApiError(cause) || isAuthError(cause) || sourceCode !== null;

  return {
    category: isSupabaseAuthFailure ? 'auth' : 'unknown',
    code:
      operation === 'login'
        ? 'LOGIN_FAILED'
        : operation === 'signup'
          ? 'UNKNOWN_AUTH_ERROR'
          : operation === 'oauth'
            ? 'GOOGLE_AUTH_FAILED'
          : operation === 'logout'
            ? 'LOGOUT_FAILED'
            : operation === 'password-reset'
              ? 'PASSWORD_RESET_REQUEST_FAILED'
              : operation === 'password-recovery'
                ? 'PASSWORD_RECOVERY_SESSION_FAILED'
              : operation === 'password-update'
                ? 'PASSWORD_UPDATE_FAILED'
                : operation === 'delete'
                  ? 'ACCOUNT_DELETION_FAILED'
                  : 'LOAD_FAILED',
    developerMessage,
    message:
      operation === 'signup'
        ? "We couldn't create your account right now. Please try again."
        : operation === 'oauth'
          ? 'Google sign-in did not complete. Please try again.'
        : operation === 'login'
          ? "We couldn't sign you in right now. Please try again."
          : operation === 'logout'
            ? 'Sign out did not complete. Try again.'
            : operation === 'password-reset'
              ? 'Password reset could not be requested. Try again.'
              : operation === 'password-recovery'
                ? 'The password reset session could not be established. Request a new link.'
            : operation === 'password-update'
              ? 'Your password could not be updated. Try again.'
              : operation === 'delete'
                ? 'Your account could not be deleted. No changes were made. Please try again.'
              : 'Account information could not be loaded. Try again.',
    retryable: true,
    sourceCode,
    status,
  };
}

export function accountAuthError(
  operation: AuthFailureOperation,
  cause?: unknown,
): AccountError {
  const normalized = normalizeAuthFailure(cause, operation);
  return createAccountError(normalized.code, normalized.message, cause, {
    category: normalized.category,
    developerMessage: normalized.developerMessage,
    retryable: normalized.retryable,
    sourceCode: normalized.sourceCode,
    status: normalized.status,
  });
}

export function logAccountAuthFailure(
  operation: AuthFailureOperation,
  cause: unknown,
) {
  if (typeof __DEV__ === 'undefined' || !__DEV__) {
    return;
  }

  const normalized = normalizeAuthFailure(cause, operation);
  console.warn(`[AccountAuth] ${operation} failed`, {
    operation,
    name: getErrorName(cause),
    code: normalized.sourceCode,
    status: normalized.status,
    message: normalized.developerMessage,
    at: new Date().toISOString(),
  });
}

export function accountLoadError(cause: unknown): AccountError {
  return accountAuthError('session', cause);
}

export function invalidEmailError(): AccountError {
  return createAccountError(
    'INVALID_EMAIL',
    'Enter a valid email address.',
  );
}

export function weakPasswordError(): AccountError {
  return createAccountError(
    'WEAK_PASSWORD',
    'Use a password with at least 8 characters.',
    undefined,
    { category: 'validation', retryable: false },
  );
}

export function loginFailedError(cause: unknown): AccountError {
  return accountAuthError('login', cause);
}

export function registerFailedError(cause: unknown): AccountError {
  return accountAuthError('signup', cause);
}

export function googleAuthFailedError(cause: unknown): AccountError {
  return accountAuthError('oauth', cause);
}

export function logoutFailedError(cause: unknown): AccountError {
  return accountAuthError('logout', cause);
}

export function accountDeletionError(cause: unknown): AccountError {
  const record = unknownRecord(cause);
  const sourceCode = getSourceCode(cause);

  if (
    sourceCode === 'account_deletion_unauthenticated' ||
    record?.code === 'ACCOUNT_DELETION_UNAUTHENTICATED'
  ) {
    return createAccountError(
      'ACCOUNT_DELETION_UNAUTHENTICATED',
      'You must be signed in to delete an account.',
      cause,
      { category: 'auth', retryable: false, sourceCode },
    );
  }

  if (
    sourceCode === 'account_deletion_session_expired' ||
    record?.code === 'ACCOUNT_DELETION_SESSION_EXPIRED'
  ) {
    return createAccountError(
      'ACCOUNT_DELETION_SESSION_EXPIRED',
      'Your session has expired. Sign in again before deleting your account.',
      cause,
      { category: 'auth', retryable: false, sourceCode },
    );
  }

  if (
    sourceCode === 'account_deletion_reauth_required' ||
    record?.code === 'ACCOUNT_DELETION_REAUTH_REQUIRED'
  ) {
    return createAccountError(
      'ACCOUNT_DELETION_REAUTH_REQUIRED',
      'Please sign in again before deleting your account.',
      cause,
      { category: 'auth', retryable: false, sourceCode },
    );
  }

  const normalized = normalizeAuthFailure(cause, 'delete');
  return createAccountError(
    'ACCOUNT_DELETION_FAILED',
    'Your account could not be deleted. No changes were made. Please try again.',
    cause,
    {
      category: normalized.category,
      developerMessage: normalized.developerMessage,
      retryable: normalized.retryable,
      sourceCode: normalized.sourceCode,
      status: normalized.status,
    },
  );
}

export function passwordResetRequestError(cause: unknown): AccountError {
  return accountAuthError('password-reset', cause);
}

export function passwordRecoverySessionFailedError(
  cause: unknown,
): AccountError {
  return accountAuthError('password-recovery', cause);
}

export function passwordUpdateFailedError(cause: unknown): AccountError {
  return accountAuthError('password-update', cause);
}

export function passwordRecoveryLinkInvalidError(cause?: unknown): AccountError {
  return createAccountError(
    'PASSWORD_RECOVERY_LINK_INVALID',
    'This password reset link is invalid. Request a new one.',
    cause,
    { category: 'auth', retryable: false },
  );
}

export function passwordRecoveryLinkExpiredError(cause?: unknown): AccountError {
  return createAccountError(
    'PASSWORD_RECOVERY_LINK_EXPIRED',
    'This password reset link is invalid or has expired. Request a new one.',
    cause,
    { category: 'auth', retryable: false },
  );
}

export function passwordsDoNotMatchError(): AccountError {
  return createAccountError(
    'PASSWORDS_DO_NOT_MATCH',
    'Passwords do not match.',
    undefined,
    { category: 'validation', retryable: false },
  );
}

export function passwordTooShortError(): AccountError {
  return createAccountError(
    'PASSWORD_TOO_SHORT',
    'Use a password with at least 8 characters.',
    undefined,
    { category: 'validation', retryable: false },
  );
}

export function logPasswordRecoveryFailure(
  operation: 'request' | 'session' | 'update' | 'finish',
  cause: unknown,
) {
  if (typeof __DEV__ === 'undefined' || !__DEV__) {
    return;
  }

  const normalized = normalizeAuthFailure(
    cause,
    operation === 'request'
      ? 'password-reset'
      : operation === 'update'
        ? 'password-update'
        : 'password-recovery',
  );

  console.warn(`[AccountAuth] password recovery ${operation} failed`, {
    operation,
    name: getErrorName(cause),
    code: normalized.sourceCode,
    status: normalized.status,
    message: normalized.developerMessage,
    at: new Date().toISOString(),
  });
}

export function preferencesLoadError(cause: unknown): PreferencesError {
  return {
    code: 'LOAD_FAILED',
    message: 'Preferences could not be loaded. Defaults are being used.',
    cause,
  };
}

export function preferencesSaveError(cause: unknown): PreferencesError {
  return {
    code: 'SAVE_FAILED',
    message: 'That preference could not be saved. Try again.',
    cause,
  };
}
