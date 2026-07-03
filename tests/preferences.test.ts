import assert from 'node:assert/strict';
import test from 'node:test';

import {
  clearStoredPreferences,
  DEFAULT_PREFERENCES,
  loadPreferences,
  normalizeStoredPreferences,
  PREFERENCES_STORAGE_KEY,
  savePreferences,
  updatePreference,
} from '../src/utils/preferences-storage';
import { createMemoryStorage } from './helpers/memory-storage';

test('uses defaults when stored preferences are missing or malformed', () => {
  assert.deepEqual(
    normalizeStoredPreferences(null),
    DEFAULT_PREFERENCES,
  );
  assert.deepEqual(
    normalizeStoredPreferences('invalid'),
    DEFAULT_PREFERENCES,
  );
});

test('updates only the selected preference', () => {
  const updated = updatePreference(
    DEFAULT_PREFERENCES,
    'notifications',
    true,
  );

  assert.deepEqual(updated, {
    ...DEFAULT_PREFERENCES,
    notifications: true,
  });
  assert.equal(updated.parkingReminders, true);
  assert.equal(updated.analytics, false);
});

test('restores supported persisted preference values', () => {
  assert.deepEqual(
    normalizeStoredPreferences({
      analytics: true,
      crashReporting: true,
      darkMode: true,
      hapticFeedback: false,
      language: 'unsupported',
      notifications: true,
      parkingReminders: false,
      units: 'imperial',
    }),
    {
      analytics: true,
      crashReporting: true,
      darkMode: true,
      hapticFeedback: false,
      language: 'system',
      notifications: true,
      parkingReminders: false,
      units: 'imperial',
    },
  );
});

test('saves, loads, and clears stored preferences', async () => {
  const storage = createMemoryStorage();
  const customized = {
    ...DEFAULT_PREFERENCES,
    notifications: true,
    units: 'imperial' as const,
  };

  await savePreferences(customized, storage);
  assert.deepEqual(await loadPreferences(storage), customized);

  await clearStoredPreferences(storage);
  assert.equal(storage.data.has(PREFERENCES_STORAGE_KEY), false);
  assert.deepEqual(await loadPreferences(storage), DEFAULT_PREFERENCES);
});

test('falls back field-by-field for invalid persisted values', () => {
  assert.deepEqual(
    normalizeStoredPreferences({
      analytics: 'yes',
      notifications: true,
      units: 'kilometers',
    }),
    {
      ...DEFAULT_PREFERENCES,
      notifications: true,
    },
  );
});
