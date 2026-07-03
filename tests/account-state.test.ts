import assert from 'node:assert/strict';
import test from 'node:test';

import { SubscriptionStatus } from '../src/types/account';
import { getCurrentAccountSnapshot } from '../src/utils/account-state';

test('current account adapter reports the truthful anonymous free state', () => {
  assert.deepEqual(getCurrentAccountSnapshot(null), {
    user: null,
    isAnonymous: true,
    isSignedIn: false,
    subscriptionStatus: SubscriptionStatus.FREE,
    displayName: 'Munich driver',
    email: null,
    avatar: null,
  });
});

