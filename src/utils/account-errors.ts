import { isAuthApiError } from '@supabase/supabase-js';

import type {
  AccountError,
  AccountErrorCode,
} from '@/types/account';
import type { PreferencesError } from '@/types/preferences';

export function createAccountError(
  code: AccountErrorCode,
  message: string,
  cause?: unknown,
): AccountError {
  return { code, message, cause };
}

export function accountLoadError(cause: unknown): AccountError {
  return createAccountError(
    'LOAD_FAILED',
    'Account information could not be loaded. Try again.',
    cause,
  );
}

function authErrorMatches(cause: unknown, terms: string[]) {
  if (!isAuthApiError(cause)) {
    return false;
  }

  const code = cause.code?.toLowerCase() ?? '';
  const message = cause.message.toLowerCase();

  return terms.some((term) => code.includes(term) || message.includes(term));
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
  );
}

export function loginFailedError(cause: unknown): AccountError {
  if (authErrorMatches(cause, ['invalid_credentials', 'invalid login'])) {
    return createAccountError(
      'LOGIN_FAILED',
      'The email or password is incorrect.',
      cause,
    );
  }

  return createAccountError(
    'LOGIN_FAILED',
    'Sign in did not complete. Check your email and password, then try again.',
    cause,
  );
}

export function registerFailedError(cause: unknown): AccountError {
  if (
    authErrorMatches(cause, [
      'already registered',
      'already exists',
      'email_exists',
      'user_already_exists',
    ])
  ) {
    return createAccountError(
      'REGISTER_FAILED',
      'An account with this email already exists. Sign in instead.',
      cause,
    );
  }

  return createAccountError(
    'REGISTER_FAILED',
    'Account creation did not complete. Check your details and try again.',
    cause,
  );
}

export function logoutFailedError(cause: unknown): AccountError {
  return createAccountError(
    'LOGOUT_FAILED',
    'Sign out did not complete. Try again.',
    cause,
  );
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
