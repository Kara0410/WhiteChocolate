import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loginWithEmailPasswordService,
  registerWithEmailPasswordService,
  resolveRegisterSuccess,
  type AccountAuthClient,
} from '../src/services/account-auth';
import { validateAccountEmail } from '../src/utils/account-validation';

const user = {
  id: 'user-1',
  email: 'Driver@Example.COM',
  user_metadata: { display_name: 'Driver' },
};

const session = {
  user,
  access_token: 'not-inspected',
  refresh_token: 'not-inspected',
} as never;

function authClient(
  overrides: Partial<AccountAuthClient>,
): AccountAuthClient {
  return {
    signInWithPassword: async () => ({ data: {}, error: null }),
    signUp: async () => ({ data: {}, error: null }),
    ...overrides,
  };
}

test('email validation normalizes addresses', () => {
  assert.deepEqual(validateAccountEmail('  USER@Example.COM  '), {
    ok: true,
    email: 'user@example.com',
  });
});

test('login service catches thrown network exceptions', async () => {
  const result = await loginWithEmailPasswordService({
    auth: authClient({
      signInWithPassword: async () => {
        throw new TypeError('fetch failed');
      },
    }),
    email: 'driver@example.com',
    password: 'password123',
  });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'NETWORK_ERROR');
  }
});

test('signup with a session returns authenticated status', async () => {
  const result = await registerWithEmailPasswordService({
    auth: authClient({
      signUp: async () => ({
        data: { user: user as never, session },
        error: null,
      }),
    }),
    email: 'driver@example.com',
    password: 'password123',
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.status, 'authenticated');
  }
});

test('signup with user but no session returns confirmation-required', async () => {
  const result = await registerWithEmailPasswordService({
    auth: authClient({
      signUp: async () => ({
        data: { user: user as never, session: null },
        error: null,
      }),
    }),
    email: ' DRIVER@example.com ',
    password: 'password123',
  });

  assert.deepEqual(result, {
    ok: true,
    status: 'confirmation-required',
    email: 'driver@example.com',
  });
});

test('signup returning neither user nor session is a safe failure', () => {
  const result = resolveRegisterSuccess({
    email: 'driver@example.com',
    session: null,
    user: null,
  });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'UNKNOWN_AUTH_ERROR');
    assert.equal(
      result.error.message.includes('Supabase signup returned'),
      false,
    );
  }
});
