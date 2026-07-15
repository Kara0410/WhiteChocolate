import type { Session, User } from '@supabase/supabase-js';

import {
  APP_AUTH_SCHEME,
  PASSWORD_RECOVERY_PATH,
} from '@/constants/auth';
import type { AccountActionResult } from '@/types/account';
import {
  invalidEmailError,
  logPasswordRecoveryFailure,
  passwordRecoveryLinkExpiredError,
  passwordRecoveryLinkInvalidError,
  passwordRecoverySessionFailedError,
  passwordResetRequestError,
  passwordTooShortError,
  passwordUpdateFailedError,
} from '@/utils/account-errors';
import {
  MIN_ACCOUNT_PASSWORD_LENGTH,
  validateAccountEmail,
} from '@/utils/account-validation';

export type PasswordRecoveryAuthClient = {
  resetPasswordForEmail: (
    email: string,
    options: { redirectTo: string },
  ) => Promise<{ data?: unknown; error: unknown }>;
  exchangeCodeForSession: (code: string) => Promise<{
    data?: { session?: Session | null };
    error: unknown;
  }>;
  setSession: (credentials: {
    access_token: string;
    refresh_token: string;
  }) => Promise<{
    data?: { session?: Session | null };
    error: unknown;
  }>;
  updateUser: (attributes: { password: string }) => Promise<{
    data?: { user?: User | null };
    error: unknown;
  }>;
  signOut: () => Promise<{ error: unknown }>;
};

export type ParsedPasswordRecoveryCallback =
  | { ok: true; kind: 'code'; code: string }
  | {
      ok: true;
      kind: 'tokens';
      accessToken: string;
      refreshToken: string;
    }
  | { ok: false; error: ReturnType<typeof passwordRecoveryLinkInvalidError> };

function callbackParameters(callbackUrl: URL) {
  const parameters = new URLSearchParams(callbackUrl.search);
  const fragment = callbackUrl.hash.startsWith('#')
    ? callbackUrl.hash.slice(1)
    : callbackUrl.hash;

  for (const [key, value] of new URLSearchParams(fragment)) {
    if (!parameters.has(key)) {
      parameters.set(key, value);
    }
  }

  return parameters;
}

function isExpectedRecoveryCallback(
  callbackUrl: URL,
  expectedRedirectTo: string,
) {
  try {
    const expectedUrl = new URL(expectedRedirectTo);
    const normalizePath = (path: string) => path.replace(/\/+$/, '') || '/';

    return (
      callbackUrl.protocol === expectedUrl.protocol &&
      callbackUrl.host === expectedUrl.host &&
      normalizePath(callbackUrl.pathname) ===
        normalizePath(expectedUrl.pathname)
    );
  } catch {
    return false;
  }
}

export function parsePasswordRecoveryCallback(
  callback: string,
  expectedRedirectTo = `${APP_AUTH_SCHEME}://${PASSWORD_RECOVERY_PATH}`,
): ParsedPasswordRecoveryCallback {
  let callbackUrl: URL;

  try {
    callbackUrl = new URL(callback);
  } catch {
    return { ok: false, error: passwordRecoveryLinkInvalidError() };
  }

  if (!isExpectedRecoveryCallback(callbackUrl, expectedRedirectTo)) {
    return { ok: false, error: passwordRecoveryLinkInvalidError() };
  }

  const parameters = callbackParameters(callbackUrl);
  const callbackError =
    parameters.get('error_code') ?? parameters.get('error');
  const callbackDescription = parameters.get('error_description');

  if (callbackError) {
    const callbackCause = {
      code: callbackError,
      message: callbackDescription ?? 'Password recovery callback error',
    };
    const lowerError = `${callbackError} ${callbackDescription ?? ''}`.toLowerCase();

    return {
      ok: false,
      error:
        lowerError.includes('expired') || lowerError.includes('otp')
          ? passwordRecoveryLinkExpiredError(callbackCause)
          : passwordRecoveryLinkInvalidError(callbackCause),
    };
  }

  const recoveryType = parameters.get('type');
  if (recoveryType && recoveryType !== 'recovery') {
    return { ok: false, error: passwordRecoveryLinkInvalidError() };
  }

  const code = parameters.get('code');
  if (code) {
    return { ok: true, kind: 'code', code };
  }

  const accessToken = parameters.get('access_token');
  const refreshToken = parameters.get('refresh_token');
  if (accessToken && refreshToken) {
    if (recoveryType !== 'recovery') {
      return { ok: false, error: passwordRecoveryLinkInvalidError() };
    }

    return { ok: true, kind: 'tokens', accessToken, refreshToken };
  }

  return { ok: false, error: passwordRecoveryLinkInvalidError() };
}

export async function requestPasswordResetCore({
  auth,
  email,
  redirectTo,
}: {
  auth: Pick<PasswordRecoveryAuthClient, 'resetPasswordForEmail'>;
  email: string;
  redirectTo: string;
}): Promise<AccountActionResult> {
  const emailResult = validateAccountEmail(email);
  if (!emailResult.ok) {
    return { ok: false, error: invalidEmailError() };
  }

  try {
    const { error } = await auth.resetPasswordForEmail(emailResult.email, {
      redirectTo,
    });

    if (error) {
      logPasswordRecoveryFailure('request', error);
      return { ok: false, error: passwordResetRequestError(error) };
    }

    return { ok: true };
  } catch (error) {
    logPasswordRecoveryFailure('request', error);
    return { ok: false, error: passwordResetRequestError(error) };
  }
}

export async function establishPasswordRecoverySessionCore({
  auth,
  callbackUrl,
  expectedRedirectTo,
}: {
  auth: Pick<
    PasswordRecoveryAuthClient,
    'exchangeCodeForSession' | 'setSession'
  >;
  callbackUrl: string;
  expectedRedirectTo: string;
}): Promise<AccountActionResult> {
  const callback = parsePasswordRecoveryCallback(
    callbackUrl,
    expectedRedirectTo,
  );

  if (!callback.ok) {
    return callback;
  }

  try {
    const result =
      callback.kind === 'code'
        ? await auth.exchangeCodeForSession(callback.code)
        : await auth.setSession({
            access_token: callback.accessToken,
            refresh_token: callback.refreshToken,
          });

    if (result.error) {
      logPasswordRecoveryFailure('session', result.error);
      return {
        ok: false,
        error: passwordRecoverySessionFailedError(result.error),
      };
    }

    if (!result.data?.session) {
      const missingSessionError = new Error(
        'Supabase returned no password recovery session.',
      );
      logPasswordRecoveryFailure('session', missingSessionError);
      return {
        ok: false,
        error: passwordRecoverySessionFailedError(missingSessionError),
      };
    }

    return { ok: true };
  } catch (error) {
    logPasswordRecoveryFailure('session', error);
    return {
      ok: false,
      error: passwordRecoverySessionFailedError(error),
    };
  }
}

export async function updateRecoveredPasswordCore({
  auth,
  password,
  recoverySessionActive,
}: {
  auth: Pick<PasswordRecoveryAuthClient, 'updateUser'>;
  password: string;
  recoverySessionActive: boolean;
}): Promise<AccountActionResult> {
  if (!recoverySessionActive) {
    return {
      ok: false,
      error: passwordRecoverySessionFailedError(
        new Error('Password recovery session is not active.'),
      ),
    };
  }

  if (password.length < MIN_ACCOUNT_PASSWORD_LENGTH) {
    return { ok: false, error: passwordTooShortError() };
  }

  try {
    const { error } = await auth.updateUser({ password });

    if (error) {
      logPasswordRecoveryFailure('update', error);
      return { ok: false, error: passwordUpdateFailedError(error) };
    }

    return { ok: true };
  } catch (error) {
    logPasswordRecoveryFailure('update', error);
    return { ok: false, error: passwordUpdateFailedError(error) };
  }
}

export async function finishPasswordRecoveryCore({
  auth,
}: {
  auth: Pick<PasswordRecoveryAuthClient, 'signOut'>;
}): Promise<AccountActionResult> {
  try {
    const { error } = await auth.signOut();

    if (error) {
      logPasswordRecoveryFailure('finish', error);
      return {
        ok: false,
        error: passwordRecoverySessionFailedError(error),
      };
    }

    return { ok: true };
  } catch (error) {
    logPasswordRecoveryFailure('finish', error);
    return {
      ok: false,
      error: passwordRecoverySessionFailedError(error),
    };
  }
}
