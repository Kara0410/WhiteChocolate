export type LanguagePreference = 'system';
export type UnitsPreference = 'metric' | 'imperial';

export type Preferences = {
  analytics: boolean;
  crashReporting: boolean;
  darkMode: boolean;
  hapticFeedback: boolean;
  language: LanguagePreference;
  notifications: boolean;
  parkingReminders: boolean;
  units: UnitsPreference;
};

export type PreferenceKey = keyof Preferences;

export type BooleanPreferenceKey = {
  [Key in PreferenceKey]: Preferences[Key] extends boolean ? Key : never;
}[PreferenceKey];

export type PreferencesError = {
  code: 'LOAD_FAILED' | 'SAVE_FAILED';
  message: string;
  cause?: unknown;
};
