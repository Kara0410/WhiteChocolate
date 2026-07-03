import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';

import type {
  PreferenceKey,
  Preferences,
  PreferencesError,
} from '@/types/preferences';
import {
  preferencesLoadError,
  preferencesSaveError,
} from '@/utils/account-errors';
import {
  DEFAULT_PREFERENCES,
  loadPreferences,
  savePreferences,
  updatePreference,
} from '@/utils/preferences-storage';

type PreferencesContextValue = {
  preferences: Preferences;
  loading: boolean;
  error: PreferencesError | null;
  refresh: () => Promise<void>;
  setPreference: <Key extends PreferenceKey>(
    key: Key,
    value: Preferences[Key],
  ) => void;
};

const PreferencesContext =
  createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: PropsWithChildren) {
  const [preferences, setPreferences] =
    useState<Preferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<PreferencesError | null>(null);
  const isMountedRef = useRef(true);
  const writeQueueRef = useRef(Promise.resolve());

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const storedPreferences = await loadPreferences();
      if (isMountedRef.current) {
        setPreferences(storedPreferences);
      }
    } catch (loadError) {
      if (isMountedRef.current) {
        setError(preferencesLoadError(loadError));
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    void refresh();

    return () => {
      isMountedRef.current = false;
    };
  }, [refresh]);

  const setPreference = useCallback(
    <Key extends PreferenceKey>(
      key: Key,
      value: Preferences[Key],
    ) => {
      setError(null);
      setPreferences((current) => {
        const next = updatePreference(current, key, value);

        writeQueueRef.current = writeQueueRef.current
          .then(() => savePreferences(next))
          .catch((saveError: unknown) => {
            if (isMountedRef.current) {
              setError(preferencesSaveError(saveError));
            }
          });

        return next;
      });
    },
    [],
  );

  const value = useMemo(
    () => ({
      preferences,
      loading,
      error,
      refresh,
      setPreference,
    }),
    [error, loading, preferences, refresh, setPreference],
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const value = useContext(PreferencesContext);

  if (value === null) {
    throw new Error(
      'usePreferences must be used within PreferencesProvider',
    );
  }

  return value;
}
