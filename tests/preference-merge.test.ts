import assert from 'node:assert/strict';
import test from 'node:test';

import { mergePreferences } from '../src/services/sync/preference-merge';
import type { Preferences } from '../src/types/preferences';
import { DEFAULT_PREFERENCES } from '../src/utils/preferences-storage';
import { deepFreeze } from './helpers/deep-freeze';

function remoteRow(
  preferences: Partial<Preferences> = {},
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  const merged = { ...DEFAULT_PREFERENCES, ...preferences };

  return {
    user_id: 'user-1',
    analytics: merged.analytics,
    crash_reporting: merged.crashReporting,
    dark_mode: merged.darkMode,
    haptic_feedback: merged.hapticFeedback,
    language: merged.language,
    notifications: merged.notifications,
    parking_reminders: merged.parkingReminders,
    units: merged.units,
    created_at: '2026-07-01T00:00:00.000Z',
    updated_at: '2026-07-02T00:00:00.000Z',
    ...overrides,
  };
}

test('missing or malformed remote rows fall back to local', () => {
  const local: Preferences = { ...DEFAULT_PREFERENCES, notifications: true };

  for (const row of [null, undefined, 'nope', 42]) {
    const result = mergePreferences(local, row);
    assert.deepEqual(result.preferences, local);
    assert.equal(result.source, 'local');
    assert.deepEqual(result.conflicts, []);
    assert.deepEqual(result.changedKeys, []);
  }
});

test('a remote row with a corrupt field is treated as malformed', () => {
  const local: Preferences = { ...DEFAULT_PREFERENCES, notifications: true };

  // Field-level fallback would turn garbage into defaults, and a "newer"
  // defaults row must never overwrite real local preferences.
  const corruptRows = [
    remoteRow({}, { analytics: 'yes' }),
    remoteRow({}, { units: 'kilometers' }),
    remoteRow({}, { language: 'de' }),
  ];

  for (const row of corruptRows) {
    const result = mergePreferences(local, row, {
      localUpdatedAt: '2026-07-01T00:00:00.000Z',
    });
    assert.deepEqual(result.preferences, local);
    assert.equal(result.source, 'local');
  }
});

test('identical preferences produce no conflicts', () => {
  const local: Preferences = { ...DEFAULT_PREFERENCES, notifications: true };
  const result = mergePreferences(local, remoteRow({ notifications: true }));

  assert.deepEqual(result.preferences, local);
  assert.equal(result.source, 'local');
  assert.deepEqual(result.conflicts, []);
  assert.deepEqual(result.changedKeys, []);
});

test('without a local timestamp local wins on differing content', () => {
  const local: Preferences = { ...DEFAULT_PREFERENCES, notifications: true };
  const result = mergePreferences(
    local,
    remoteRow({ notifications: false, units: 'imperial' }),
  );

  assert.deepEqual(result.preferences, local);
  assert.equal(result.source, 'local');
  assert.deepEqual(
    result.conflicts.map(({ key }) => key).sort(),
    ['notifications', 'units'],
  );
  assert.equal(
    result.conflicts.every(({ winner }) => winner === 'local'),
    true,
  );
  assert.deepEqual(result.changedKeys, []);
});

test('a newer remote row wins when both timestamps exist', () => {
  const local: Preferences = { ...DEFAULT_PREFERENCES, notifications: true };
  const result = mergePreferences(
    local,
    remoteRow(
      { notifications: false, units: 'imperial' },
      { updated_at: '2026-07-03T00:00:00.000Z' },
    ),
    { localUpdatedAt: '2026-07-01T00:00:00.000Z' },
  );

  assert.equal(result.source, 'remote');
  assert.equal(result.preferences.notifications, false);
  assert.equal(result.preferences.units, 'imperial');
  assert.deepEqual(
    result.changedKeys.sort(),
    ['notifications', 'units'],
  );
  assert.equal(
    result.conflicts.every(({ winner }) => winner === 'remote'),
    true,
  );
});

test('a newer local timestamp beats an older remote row', () => {
  const local: Preferences = { ...DEFAULT_PREFERENCES, notifications: true };
  const result = mergePreferences(
    local,
    remoteRow(
      { notifications: false },
      { updated_at: '2026-07-01T00:00:00.000Z' },
    ),
    { localUpdatedAt: '2026-07-03T00:00:00.000Z' },
  );

  assert.equal(result.source, 'local');
  assert.deepEqual(result.preferences, local);
});

test('the result is always a complete preferences object', () => {
  const result = mergePreferences(
    {} as Preferences,
    null,
  );

  assert.deepEqual(result.preferences, DEFAULT_PREFERENCES);
});

test('inputs are not mutated', () => {
  const local = deepFreeze({ ...DEFAULT_PREFERENCES, notifications: true });
  const remote = deepFreeze(remoteRow({ units: 'imperial' }));

  // Frozen inputs throw on any mutation attempt in strict mode.
  const result = mergePreferences(local, remote);
  assert.equal(result.preferences.notifications, true);
});
