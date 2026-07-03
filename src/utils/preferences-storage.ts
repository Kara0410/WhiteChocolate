import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Preferences } from '@/types/preferences';

export const PREFERENCES_STORAGE_KEY =
  '@white-choclate/preferences/v1';

export const DEFAULT_PREFERENCES: Preferences = {
  analytics: false,
  crashReporting: false,
  darkMode: false,
  hapticFeedback: true,
  language: 'system',
  notifications: false,
  parkingReminders: true,
  units: 'metric',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function normalizeStoredPreferences(value: unknown): Preferences {
  if (!isRecord(value)) {
    return DEFAULT_PREFERENCES;
  }

  return {
    analytics:
      typeof value.analytics === 'boolean'
        ? value.analytics
        : DEFAULT_PREFERENCES.analytics,
    crashReporting:
      typeof value.crashReporting === 'boolean'
        ? value.crashReporting
        : DEFAULT_PREFERENCES.crashReporting,
    darkMode:
      typeof value.darkMode === 'boolean'
        ? value.darkMode
        : DEFAULT_PREFERENCES.darkMode,
    hapticFeedback:
      typeof value.hapticFeedback === 'boolean'
        ? value.hapticFeedback
        : DEFAULT_PREFERENCES.hapticFeedback,
    language: 'system',
    notifications:
      typeof value.notifications === 'boolean'
        ? value.notifications
        : DEFAULT_PREFERENCES.notifications,
    parkingReminders:
      typeof value.parkingReminders === 'boolean'
        ? value.parkingReminders
        : DEFAULT_PREFERENCES.parkingReminders,
    units:
      value.units === 'imperial' || value.units === 'metric'
        ? value.units
        : DEFAULT_PREFERENCES.units,
  };
}

export async function loadPreferences(): Promise<Preferences> {
  const storedValue = await AsyncStorage.getItem(PREFERENCES_STORAGE_KEY);

  if (storedValue === null) {
    return DEFAULT_PREFERENCES;
  }

  return normalizeStoredPreferences(JSON.parse(storedValue));
}

export async function savePreferences(
  preferences: Preferences,
): Promise<void> {
  await AsyncStorage.setItem(
    PREFERENCES_STORAGE_KEY,
    JSON.stringify(preferences),
  );
}
