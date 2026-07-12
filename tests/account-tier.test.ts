import assert from 'node:assert/strict';
import test from 'node:test';

import { SubscriptionStatus } from '../src/types/account';
import { getAccountAccessTier } from '../src/utils/account-tier';

test('derives guest tier for signed-out users', () => {
  assert.equal(
    getAccountAccessTier({
      isSignedIn: false,
      subscriptionStatus: SubscriptionStatus.PREMIUM,
    }),
    'guest',
  );
});

test('derives free tier for signed-in non-premium users', () => {
  assert.equal(
    getAccountAccessTier({
      isSignedIn: true,
      subscriptionStatus: SubscriptionStatus.FREE,
    }),
    'free',
  );
  assert.equal(
    getAccountAccessTier({
      isSignedIn: true,
      subscriptionStatus: SubscriptionStatus.UNKNOWN,
    }),
    'free',
  );
});

test('derives premium tier for premium and lifetime users', () => {
  assert.equal(
    getAccountAccessTier({
      isSignedIn: true,
      subscriptionStatus: SubscriptionStatus.PREMIUM,
    }),
    'premium',
  );
  assert.equal(
    getAccountAccessTier({
      isSignedIn: true,
      subscriptionStatus: SubscriptionStatus.LIFETIME,
    }),
    'premium',
  );
});
