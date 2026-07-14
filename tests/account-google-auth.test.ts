import assert from 'node:assert/strict';
import test from 'node:test';

import {
  performGoogleOAuth,
  parseGoogleOAuthCallback,
  type GoogleOAuthAuthClient,
} from '../src/services/account-google-auth-core';

const redirectTo = 'whitechoclate://auth/callback';
const oauthUrl = 'https://example.supabase.co/auth/v1/authorize';

function authClient(
  overrides: Partial<GoogleOAuthAuthClient> = {},
): GoogleOAuthAuthClient {
  return {
    signInWithOAuth: async () => ({ data: { url: oauthUrl }, error: null }),
    setSession: async () => ({ data: { session: {} }, error: null }),
    ...overrides,
  };
}

test('parses successful Google callbacks from hash and query parameters', () => {
  const hashResult = parseGoogleOAuthCallback(
    `${redirectTo}#access_token=fake-access&refresh_token=fake-refresh`,
  );
  const queryResult = parseGoogleOAuthCallback(
    `${redirectTo}?access_token=fake-access&refresh_token=fake-refresh`,
  );

  assert.deepEqual(hashResult, {
    ok: true,
    accessToken: 'fake-access',
    refreshToken: 'fake-refresh',
  });
  assert.deepEqual(queryResult, hashResult);
});

test('rejects callbacks that are missing session credentials', () => {
  const result = parseGoogleOAuthCallback(
    `${redirectTo}#access_token=fake-access`,
  );

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'GOOGLE_AUTH_CREDENTIALS_MISSING');
  }
});

test('maps callback error parameters without exposing provider details', () => {
  const result = parseGoogleOAuthCallback(
    `${redirectTo}#error=access_denied&error_description=provider-detail`,
  );

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'GOOGLE_AUTH_FAILED');
    assert.equal(result.error.message.includes('provider-detail'), false);
  }
});

test('rejects callbacks for a different app path', () => {
  const result = parseGoogleOAuthCallback(
    'whitechoclate://unexpected/callback#access_token=a&refresh_token=b',
  );

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'GOOGLE_AUTH_CALLBACK_INVALID');
  }
});

test('browser cancellation returns a quiet cancellation result', async () => {
  let sessionCalls = 0;
  const result = await performGoogleOAuth({
    auth: authClient({
      setSession: async () => {
        sessionCalls += 1;
        return { data: { session: {} }, error: null };
      },
    }),
    openAuthSessionAsync: async () => ({ type: 'cancel' }),
    platform: 'ios',
    redirectTo,
  });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'GOOGLE_AUTH_CANCELLED');
  }
  assert.equal(sessionCalls, 0);
});

test('successful callbacks create a Supabase session', async () => {
  let sessionCredentials: {
    access_token: string;
    refresh_token: string;
  } | null = null;
  const result = await performGoogleOAuth({
    auth: authClient({
      setSession: async (credentials) => {
        sessionCredentials = credentials;
        return { data: { session: {} }, error: null };
      },
    }),
    openAuthSessionAsync: async () => ({
      type: 'success',
      url: `${redirectTo}#access_token=fake-access&refresh_token=fake-refresh`,
    }),
    platform: 'ios',
    redirectTo,
  });

  assert.deepEqual(result, { ok: true });
  assert.deepEqual(sessionCredentials, {
    access_token: 'fake-access',
    refresh_token: 'fake-refresh',
  });
});

test('web returns an unavailable result without starting OAuth', async () => {
  let oauthCalls = 0;
  const result = await performGoogleOAuth({
    auth: authClient({
      signInWithOAuth: async () => {
        oauthCalls += 1;
        return { data: { url: oauthUrl }, error: null };
      },
    }),
    openAuthSessionAsync: async () => ({ type: 'cancel' }),
    platform: 'web',
    redirectTo,
  });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'GOOGLE_AUTH_UNAVAILABLE');
  }
  assert.equal(oauthCalls, 0);
});

test('maps Supabase OAuth startup errors through account errors', async () => {
  const result = await performGoogleOAuth({
    auth: authClient({
      signInWithOAuth: async () => ({
        data: null,
        error: { code: 'provider_disabled', message: 'raw provider detail' },
      }),
    }),
    openAuthSessionAsync: async () => ({ type: 'cancel' }),
    platform: 'android',
    redirectTo,
  });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'GOOGLE_AUTH_FAILED');
    assert.equal(result.error.message.includes('raw provider detail'), false);
  }
});

test('handles missing OAuth URLs before opening the browser', async () => {
  let browserCalls = 0;
  const result = await performGoogleOAuth({
    auth: authClient({
      signInWithOAuth: async () => ({ data: { url: null }, error: null }),
    }),
    openAuthSessionAsync: async () => {
      browserCalls += 1;
      return { type: 'cancel' };
    },
    platform: 'ios',
    redirectTo,
  });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'GOOGLE_AUTH_URL_MISSING');
  }
  assert.equal(browserCalls, 0);
});

test('reports failed Supabase session creation separately', async () => {
  const result = await performGoogleOAuth({
    auth: authClient({
      setSession: async () => ({
        data: { session: null },
        error: new Error('session failed'),
      }),
    }),
    openAuthSessionAsync: async () => ({
      type: 'success',
      url: `${redirectTo}#access_token=fake-access&refresh_token=fake-refresh`,
    }),
    platform: 'android',
    redirectTo,
  });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'GOOGLE_AUTH_SESSION_FAILED');
  }
});
