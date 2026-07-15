import assert from 'node:assert/strict';
import test from 'node:test';

import {
  establishPasswordRecoverySessionCore,
  finishPasswordRecoveryCore,
  requestPasswordResetCore,
  updateRecoveredPasswordCore,
  type PasswordRecoveryAuthClient,
} from '../src/services/account-password-recovery-core';

const session = {
  access_token: 'access-token',
  refresh_token: 'refresh-token',
  user: { id: 'user-1' },
} as never;

function recoveryClient(
  overrides: Partial<PasswordRecoveryAuthClient> = {},
): PasswordRecoveryAuthClient {
  return {
    resetPasswordForEmail: async () => ({ data: {}, error: null }),
    exchangeCodeForSession: async () => ({
      data: { session },
      error: null,
    }),
    setSession: async () => ({ data: { session }, error: null }),
    updateUser: async () => ({ data: { user: {} as never }, error: null }),
    signOut: async () => ({ error: null }),
    ...overrides,
  };
}

test('password reset normalizes the email and sends the generated redirect URL', async () => {
  let receivedEmail = '';
  let receivedRedirect = '';

  const result = await requestPasswordResetCore({
    auth: recoveryClient({
      resetPasswordForEmail: async (email, options) => {
        receivedEmail = email;
        receivedRedirect = options.redirectTo;
        return { data: {}, error: null };
      },
    }),
    email: ' Driver@Example.COM ',
    redirectTo: 'whitechoclate://auth/reset-password',
  });

  assert.deepEqual(result, { ok: true });
  assert.equal(receivedEmail, 'driver@example.com');
  assert.equal(receivedRedirect, 'whitechoclate://auth/reset-password');
});

test('password reset failures are mapped to safe account errors', async () => {
  const result = await requestPasswordResetCore({
    auth: recoveryClient({
      resetPasswordForEmail: async () => ({
        data: null,
        error: {
          code: 'over_request_rate_limit',
          message: 'internal rate limit details',
          status: 429,
        },
      }),
    }),
    email: 'driver@example.com',
    redirectTo: 'whitechoclate://auth/reset-password',
  });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'RATE_LIMITED');
    assert.equal(result.error.message.includes('internal'), false);
  }
});

test('PKCE recovery callbacks exchange their code for a session', async () => {
  let receivedCode = '';
  const result = await establishPasswordRecoverySessionCore({
    auth: recoveryClient({
      exchangeCodeForSession: async (code) => {
        receivedCode = code;
        return { data: { session }, error: null };
      },
    }),
    callbackUrl: 'whitechoclate://auth/reset-password?code=recovery-code',
    expectedRedirectTo: 'whitechoclate://auth/reset-password',
  });

  assert.deepEqual(result, { ok: true });
  assert.equal(receivedCode, 'recovery-code');
});

test('token recovery callbacks establish a Supabase session', async () => {
  let receivedTokens: { access_token: string; refresh_token: string } | null =
    null;
  const result = await establishPasswordRecoverySessionCore({
    auth: recoveryClient({
      setSession: async (tokens) => {
        receivedTokens = tokens;
        return { data: { session }, error: null };
      },
    }),
    callbackUrl:
      'whitechoclate://auth/reset-password#access_token=access-token&refresh_token=refresh-token&type=recovery',
    expectedRedirectTo: 'whitechoclate://auth/reset-password',
  });

  assert.deepEqual(result, { ok: true });
  assert.deepEqual(receivedTokens, {
    access_token: 'access-token',
    refresh_token: 'refresh-token',
  });
});

test('password updates require an established recovery session and minimum length', async () => {
  const inactiveResult = await updateRecoveredPasswordCore({
    auth: recoveryClient(),
    password: 'password123',
    recoverySessionActive: false,
  });
  assert.equal(inactiveResult.ok, false);
  if (!inactiveResult.ok) {
    assert.equal(inactiveResult.error.code, 'PASSWORD_RECOVERY_SESSION_FAILED');
  }

  const shortResult = await updateRecoveredPasswordCore({
    auth: recoveryClient(),
    password: 'short',
    recoverySessionActive: true,
  });
  assert.equal(shortResult.ok, false);
  if (!shortResult.ok) {
    assert.equal(shortResult.error.code, 'PASSWORD_TOO_SHORT');
  }
});

test('successful password update and recovery cleanup call the existing auth APIs', async () => {
  let updatedPassword = '';
  let signedOut = false;
  const auth = recoveryClient({
    updateUser: async ({ password }) => {
      updatedPassword = password;
      return { data: { user: {} as never }, error: null };
    },
    signOut: async () => {
      signedOut = true;
      return { error: null };
    },
  });

  const updateResult = await updateRecoveredPasswordCore({
    auth,
    password: 'new-password-123',
    recoverySessionActive: true,
  });
  const cleanupResult = await finishPasswordRecoveryCore({ auth });

  assert.deepEqual(updateResult, { ok: true });
  assert.deepEqual(cleanupResult, { ok: true });
  assert.equal(updatedPassword, 'new-password-123');
  assert.equal(signedOut, true);
});
