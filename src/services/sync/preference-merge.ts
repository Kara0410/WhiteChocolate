import type { PreferenceKey, Preferences } from '@/types/preferences';
import {
  DEFAULT_PREFERENCES,
  normalizeStoredPreferences,
} from '@/utils/preferences-storage';

import type { SyncConflict, SyncSource } from './sync-types';
import {
  isNonEmptyString,
  isRecord,
  parseTimestamp,
} from './sync-validation';

export const PREFERENCE_KEYS = Object.keys(
  DEFAULT_PREFERENCES,
) as PreferenceKey[];

export type PreferenceMergeOptions = {
  /**
   * When the local preferences gained a known timestamp (not tracked today),
   * pass it here so "newest wins" can apply. Without it, local wins on any
   * differing content.
   */
  localUpdatedAt?: string | null;
};

export type PreferenceMergeResult = {
  preferences: Preferences;
  source: SyncSource;
  conflicts: SyncConflict[];
  /** Keys whose value changed compared to the local input. */
  changedKeys: PreferenceKey[];
};

type RemotePreferences = {
  preferences: Preferences;
  updatedAt: string | null;
};

/**
 * Maps a user_preferences row (unknown until validated) to the local
 * Preferences shape. Strict on purpose: if any of the 8 fields has an
 * unexpected type, the whole row is treated as malformed and local wins —
 * normalizing a garbage row into defaults could otherwise overwrite real
 * local preferences with defaults on a "remote newer" merge.
 */
function normalizeRemotePreferencesRow(
  value: unknown,
): RemotePreferences | null {
  if (!isRecord(value)) {
    return null;
  }

  const candidate = {
    analytics: value.analytics,
    crashReporting: value.crash_reporting,
    darkMode: value.dark_mode,
    hapticFeedback: value.haptic_feedback,
    language: value.language,
    notifications: value.notifications,
    parkingReminders: value.parking_reminders,
    units: value.units,
  };

  const booleanKeys = [
    'analytics',
    'crashReporting',
    'darkMode',
    'hapticFeedback',
    'notifications',
    'parkingReminders',
  ] as const;

  for (const key of booleanKeys) {
    if (typeof candidate[key] !== 'boolean') {
      return null;
    }
  }

  if (candidate.language !== 'system') {
    return null;
  }

  if (candidate.units !== 'metric' && candidate.units !== 'imperial') {
    return null;
  }

  return {
    preferences: normalizeStoredPreferences(candidate),
    updatedAt: isNonEmptyString(value.updated_at) ? value.updated_at : null,
  };
}

/**
 * Pure merge of local preferences with the user_preferences row. Never
 * mutates its inputs and performs no I/O. Always returns a complete
 * Preferences object with defaults filled in.
 *
 * The winner is chosen wholesale (not per key): newest updatedAt when both
 * sides have one, otherwise local. Wholesale is predictable for the user —
 * a mixed per-key result would match neither device's settings.
 */
export function mergePreferences(
  localPreferences: Preferences,
  remoteRow: unknown,
  options: PreferenceMergeOptions = {},
): PreferenceMergeResult {
  const local = normalizeStoredPreferences(localPreferences);
  const remote = normalizeRemotePreferencesRow(remoteRow);

  if (!remote) {
    return { preferences: local, source: 'local', conflicts: [], changedKeys: [] };
  }

  const differingKeys = PREFERENCE_KEYS.filter(
    (key) => !Object.is(local[key], remote.preferences[key]),
  );

  if (differingKeys.length === 0) {
    return { preferences: local, source: 'local', conflicts: [], changedKeys: [] };
  }

  const localMs = parseTimestamp(options.localUpdatedAt);
  const remoteMs = parseTimestamp(remote.updatedAt);
  const winner: 'local' | 'remote' =
    localMs !== null && remoteMs !== null && remoteMs > localMs
      ? 'remote'
      : 'local';

  return {
    preferences: winner === 'local' ? local : remote.preferences,
    source: winner,
    conflicts: differingKeys.map((key) => ({
      domain: 'preferences' as const,
      key,
      winner,
    })),
    changedKeys: winner === 'remote' ? differingKeys : [],
  };
}
