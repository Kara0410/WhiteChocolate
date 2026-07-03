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
