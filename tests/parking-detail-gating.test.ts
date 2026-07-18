import assert from 'node:assert/strict';
import test from 'node:test';

import {
  FREE_DETAIL_PREVIEW_CARDS,
  PREMIUM_DETAIL_PREVIEW_SECTIONS,
  getParkingDetailAccess,
  getParkingDetailGateCopy,
  getPremiumGateRoute,
} from '../src/utils/parking-detail-gating';
import { SubscriptionStatus } from '../src/types/account';
import { getAccountAccessTier } from '../src/utils/account-tier';

const realLockedValues = [
  '$2.00 / hr',
  'Max daily $14.40',
  '2 hours',
  'Check local signs',
  '3 min walk',
  '250 m',
  'To your destination',
  '24 hours',
  'Open now',
  '6 / 10 available',
  'Type 2',
  '22 kW',
  'Available',
  '2.10 m',
  '2.40 m',
  'Restricted',
  'VISA',
  'Mastercard',
  '92%',
  'spaces',
  'Just now',
];

test('guest users do not receive free or premium parking details access', () => {
  assert.deepEqual(getParkingDetailAccess('guest'), {
    hasFreeDetailsAccess: false,
    hasPremiumDetailsAccess: false,
  });
});

test('free users receive free details but not premium details', () => {
  assert.deepEqual(getParkingDetailAccess('free'), {
    hasFreeDetailsAccess: true,
    hasPremiumDetailsAccess: false,
  });
});

test('premium users receive all parking detail access', () => {
  assert.deepEqual(getParkingDetailAccess('premium'), {
    hasFreeDetailsAccess: true,
    hasPremiumDetailsAccess: true,
  });
});

test('lifetime users receive all parking detail access through premium tier', () => {
  const tier = getAccountAccessTier({
    isSignedIn: true,
    subscriptionStatus: SubscriptionStatus.LIFETIME,
  });

  assert.equal(tier, 'premium');
  assert.deepEqual(getParkingDetailAccess(tier), {
    hasFreeDetailsAccess: true,
    hasPremiumDetailsAccess: true,
  });
});

test('unknown subscription state keeps free details but does not expose premium details', () => {
  const tier = getAccountAccessTier({
    isSignedIn: true,
    subscriptionStatus: SubscriptionStatus.UNKNOWN,
  });

  assert.equal(tier, 'free');
  assert.deepEqual(getParkingDetailAccess(tier), {
    hasFreeDetailsAccess: true,
    hasPremiumDetailsAccess: false,
  });
});

test('safe preview models do not contain real item-derived locked values', () => {
  const previewText = JSON.stringify({
    free: FREE_DETAIL_PREVIEW_CARDS,
    premium: PREMIUM_DETAIL_PREVIEW_SECTIONS,
  });

  for (const value of realLockedValues) {
    assert.equal(
      previewText.includes(value),
      false,
      `Preview model must not include ${value}`,
    );
  }
});

test('gate copy and upgrade destination match the intended actions', () => {
  assert.deepEqual(getParkingDetailGateCopy('free-details'), {
    title: 'Unlock parking details',
    description:
      'Create a free account to save parking locations and preferences.',
    actionLabel: 'Create free account',
    accessibilityLabel:
      'Parking features locked. Create a free account to save parking locations and preferences.',
    accessibilityHint: 'Opens the account creation sheet.',
  });

  assert.deepEqual(getParkingDetailGateCopy('premium-details'), {
    title: 'Unlock advanced parking insights',
    description:
      'Upgrade to Premium for additional estimate explanations and data-quality context.',
    actionLabel: 'Explore Premium',
    accessibilityLabel:
      'Advanced parking insights locked. Upgrade to Premium for additional estimate explanations and data-quality context.',
    accessibilityHint: 'Opens Premium membership options.',
  });

  assert.equal(getPremiumGateRoute(), '/billing');
});
