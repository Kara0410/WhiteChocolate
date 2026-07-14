import type { AccountActionResult, AccountErrorCode } from '@/types/account';
import {
  createAccountError,
  googleAuthFailedError,
} from '@/utils/account-errors';

const APP_CALLBACK_URL = 'whitechoclate://auth/callback';

type GoogleOAuthCredentials = {
  provider: 'google';
  options: {
    redirectTo: string;
    skipBrowserRedirect: true;
  };
};

export type GoogleOAuthAuthClient = {
  signInWithOAuth: (
    credentials: GoogleOAuthCredentials,
  ) => Promise<{
    data: { url?: string | null } | null;
    error: unknown;
  }>;
  setSession: (credentials: {
    access_token: string;
    refresh_token: string;
  }) => Promise<{
    data?: { session?: unknown | null };
    error: unknown;
  }>;
};

type AuthSessionResult = {
  type: string;
  url?: string;
};

type ParsedGoogleOAuthCallback =
  | {
      ok: true;
      accessToken: string;
      refreshToken: string;
    }
  | {
      ok: false;
      error: ReturnType<typeof createAccountError>;
    };

function googleOAuthError(
  code: AccountErrorCode,
  message: string,
  cause?: unknown,
) {
  return createAccountError(code, message, cause, {
    category: code === 'GOOGLE_AUTH_UNAVAILABLE' ? 'configuration' : 'auth',
    retryable:
      code !== 'GOOGLE_AUTH_CANCELLED' &&
      code !== 'GOOGLE_AUTH_CALLBACK_INVALID',
  });
}

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

function isExpectedCallback(callbackUrl: URL, expectedRedirectTo: string) {
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

export function parseGoogleOAuthCallback(
  callback: string,
  expectedRedirectTo = APP_CALLBACK_URL,
): ParsedGoogleOAuthCallback {
  let callbackUrl: URL;

  try {
    callbackUrl = new URL(callback);
  } catch {
    return {
      ok: false,
      error: googleOAuthError(
        'GOOGLE_AUTH_CALLBACK_INVALID',
        'Google sign-in returned an invalid response. Please try again.',
      ),
    };
  }

  if (!isExpectedCallback(callbackUrl, expectedRedirectTo)) {
    return {
      ok: false,
      error: googleOAuthError(
        'GOOGLE_AUTH_CALLBACK_INVALID',
        'Google sign-in returned an invalid response. Please try again.',
      ),
    };
  }

  const parameters = callbackParameters(callbackUrl);
  const callbackError =
    parameters.get('error_code') ?? parameters.get('error');

  if (callbackError) {
    return {
      ok: false,
      error: googleOAuthError(
        'GOOGLE_AUTH_FAILED',
        'Google sign-in did not complete. Please try again.',
        {
          code: callbackError,
          message:
            parameters.get('error_description') ?? 'OAuth callback error',
        },
      ),
    };
  }

  const accessToken = parameters.get('access_token');
  const refreshToken = parameters.get('refresh_token');

  if (!accessToken || !refreshToken) {
    return {
      ok: false,
      error: googleOAuthError(
        'GOOGLE_AUTH_CREDENTIALS_MISSING',
        'Google sign-in returned an incomplete response. Please try again.',
      ),
    };
  }

  return { ok: true, accessToken, refreshToken };
}

export async function performGoogleOAuth({
  auth,
  openAuthSessionAsync,
  platform,
  redirectTo,
}: {
  auth: GoogleOAuthAuthClient;
  openAuthSessionAsync: (
    url: string,
    redirectUrl: string,
  ) => Promise<AuthSessionResult>;
  platform: string;
  redirectTo: string;
}): Promise<AccountActionResult> {
  if (platform === 'web') {
    return {
      ok: false,
      error: googleOAuthError(
        'GOOGLE_AUTH_UNAVAILABLE',
        'Google sign-in is available in the iOS and Android app.',
      ),
    };
  }

  try {
    const { data, error } = await auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      return { ok: false, error: googleAuthFailedError(error) };
    }

    if (!data?.url) {
      return {
        ok: false,
        error: googleOAuthError(
          'GOOGLE_AUTH_URL_MISSING',
          'Google sign-in could not start. Please try again.',
        ),
      };
    }

    const browserResult = await openAuthSessionAsync(data.url, redirectTo);

    if (
      browserResult.type === 'cancel' ||
      browserResult.type === 'dismiss'
    ) {
      return {
        ok: false,
        error: googleOAuthError(
          'GOOGLE_AUTH_CANCELLED',
          'Google sign-in was canceled.',
        ),
      };
    }

    if (browserResult.type !== 'success' || !browserResult.url) {
      return {
        ok: false,
        error: googleOAuthError(
          'GOOGLE_AUTH_CALLBACK_INVALID',
          'Google sign-in returned an invalid response. Please try again.',
        ),
      };
    }

    const callback = parseGoogleOAuthCallback(
      browserResult.url,
      redirectTo,
    );

    if (!callback.ok) {
      return callback;
    }

    const { data: sessionData, error: sessionError } = await auth.setSession({
      access_token: callback.accessToken,
      refresh_token: callback.refreshToken,
    });

    if (sessionError || !sessionData?.session) {
      return {
        ok: false,
        error: googleOAuthError(
          'GOOGLE_AUTH_SESSION_FAILED',
          'Google sign-in could not finish. Please try again.',
          sessionError ?? new Error('Supabase returned no OAuth session.'),
        ),
      };
    }

    return { ok: true };
  } catch (error) {
    return { ok: false, error: googleAuthFailedError(error) };
  }
}
