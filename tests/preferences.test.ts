import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_PREFERENCES,
  normalizeStoredPreferences,
} from '../src/utils/preferences-storage';

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
