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

export function signInFailedError(cause: unknown): AccountError {
  // Supabase's built-in email sender has a low default rate limit; the
  // generic "check the email address" copy is actively misleading here.
  if (isAuthApiError(cause) && cause.code === 'over_email_send_rate_limit') {
    return createAccountError(
      'SIGNIN_FAILED',
      'Too many sign-in codes were requested. Wait a few minutes and try again.',
      cause,
    );
  }

  return createAccountError(
    'SIGNIN_FAILED',
    'The sign-in code could not be sent. Check the email address and try again.',
    cause,
  );
}

export function verifyFailedError(cause: unknown): AccountError {
  return createAccountError(
    'VERIFY_FAILED',
    'That code did not work. Check the latest email or request a new code.',
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
