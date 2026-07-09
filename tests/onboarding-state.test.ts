import assert from 'node:assert/strict';
import test from 'node:test';

import {
  clearOnboardingState,
  DEFAULT_ONBOARDING_STATE,
  loadOnboardingState,
  normalizeStoredOnboardingState,
  ONBOARDING_STORAGE_KEY,
  ONBOARDING_VERSION,
  saveOnboardingState,
  shouldShowOnboardingForState,
} from '../src/utils/onboarding-state';
import { createMemoryStorage } from './helpers/memory-storage';

test('normalizes missing or malformed onboarding state to defaults', () => {
  assert.deepEqual(
    normalizeStoredOnboardingState(null),
    DEFAULT_ONBOARDING_STATE,
  );
  assert.deepEqual(
    normalizeStoredOnboardingState('invalid'),
    DEFAULT_ONBOARDING_STATE,
  );
});

test('restores supported onboarding state fields', () => {
  assert.deepEqual(
    normalizeStoredOnboardingState({
      hasCompletedOnboarding: true,
      completedVersion: ONBOARDING_VERSION,
      completedAt: '2026-07-09T00:00:00.000Z',
      skippedAccount: true,
      skippedVehicle: true,
      hasSeenMapTip: true,
      hasSeenFavoritesTip: true,
      hasSeenGarageTip: true,
    }),
    {
      hasCompletedOnboarding: true,
      completedVersion: ONBOARDING_VERSION,
      completedAt: '2026-07-09T00:00:00.000Z',
      skippedAccount: true,
      skippedVehicle: true,
      hasSeenMapTip: true,
      hasSeenFavoritesTip: true,
      hasSeenGarageTip: true,
    },
  );
});

test('shows onboarding for incomplete or old-version state', () => {
  assert.equal(
    shouldShowOnboardingForState(DEFAULT_ONBOARDING_STATE),
    true,
  );
  assert.equal(
    shouldShowOnboardingForState({
      ...DEFAULT_ONBOARDING_STATE,
      hasCompletedOnboarding: true,
      completedVersion: ONBOARDING_VERSION - 1,
    }),
    true,
  );
  assert.equal(
    shouldShowOnboardingForState({
      ...DEFAULT_ONBOARDING_STATE,
      hasCompletedOnboarding: true,
      completedVersion: ONBOARDING_VERSION,
    }),
    false,
  );
});

test('saves, loads, and clears onboarding state', async () => {
  const storage = createMemoryStorage();
  const completedState = {
    ...DEFAULT_ONBOARDING_STATE,
    hasCompletedOnboarding: true,
    completedVersion: ONBOARDING_VERSION,
    completedAt: '2026-07-09T00:00:00.000Z',
    skippedAccount: true,
  };

  await saveOnboardingState(completedState, storage);
  assert.deepEqual(await loadOnboardingState(storage), completedState);

  await clearOnboardingState(storage);
  assert.equal(storage.data.has(ONBOARDING_STORAGE_KEY), false);
  assert.deepEqual(
    await loadOnboardingState(storage),
    DEFAULT_ONBOARDING_STATE,
  );
});

test('loading corrupted onboarding JSON falls back to defaults', async () => {
  const storage = createMemoryStorage();
  storage.data.set(ONBOARDING_STORAGE_KEY, '{not valid json');

  assert.deepEqual(
    await loadOnboardingState(storage),
    DEFAULT_ONBOARDING_STATE,
  );
});
