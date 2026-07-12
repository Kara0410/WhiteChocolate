import assert from 'node:assert/strict';
import test from 'node:test';
import type { Session } from '@supabase/supabase-js';

import {
  hydrateAccountSession,
  subscribeToAccountAuthChanges,
} from '../src/services/account-session';
import type { AccountUser } from '../src/types/account';

const user = {
  id: 'user-1',
  email: 'driver@example.com',
  user_metadata: {},
};

const session = { user } as Session;

test('account session hydration updates shared state from getSession', async () => {
  let loading = false;
  let accountUser: AccountUser | null = null;
  let error: unknown = undefined;

  await hydrateAccountSession({
    auth: {
      getSession: async () => ({
        data: { session },
        error: null,
      }),
    },
    setError: (nextError) => {
      error = nextError;
    },
    setLoading: (nextLoading) => {
      loading = nextLoading;
    },
    setUser: (nextUser) => {
      accountUser = nextUser;
    },
  });

  assert.equal(loading, false);
  assert.equal(error, null);
  assert.equal((accountUser as AccountUser | null)?.id, 'user-1');
});

test('auth-state event updates and listener cleanup are wired once per subscription', () => {
  const holder: {
    callback?: (event: string, nextSession: Session | null) => void;
  } = {};
  let unsubscribeCount = 0;
  const seen: Array<AccountUser | null> = [];

  const unsubscribe = subscribeToAccountAuthChanges({
    auth: {
      onAuthStateChange: (nextCallback) => {
        holder.callback = nextCallback;
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                unsubscribeCount += 1;
              },
            },
          },
        };
      },
    },
    onSession: (nextSession) => {
      seen.push(
        nextSession
          ? {
              id: nextSession.user.id,
              displayName: 'driver',
              email: nextSession.user.email ?? '',
              avatarUrl: null,
            }
          : null,
      );
    },
  });

  const emit = holder.callback;
  if (!emit) {
    throw new Error('Expected auth listener callback to be registered.');
  }
  emit('SIGNED_IN', session);
  emit('SIGNED_OUT', null);
  unsubscribe();

  assert.deepEqual(
    seen.map((nextUser) => nextUser?.id ?? null),
    ['user-1', null],
  );
  assert.equal(unsubscribeCount, 1);
});
