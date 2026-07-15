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
import type { AppActionResult } from '@/types/app-error';
import { normalizeAppError } from '@/utils/app-errors';
import {
  preferencesLoadError,
  preferencesSaveError,
} from '@/utils/account-errors';
import {
  clearStoredPreferences,
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
  resetPreferences: () => Promise<AppActionResult>;
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

  const resetPreferences = useCallback((): Promise<AppActionResult> => {
    setError(null);
    setPreferences(DEFAULT_PREFERENCES);

    // Defaults are represented by an absent key, so reset removes it
    // instead of writing the default values back.
    const writePromise = writeQueueRef.current
      .then(() => clearStoredPreferences())
    const resultPromise = writePromise.then(
      () => ({ ok: true }) as const,
      (saveError: unknown) => {
        if (isMountedRef.current) {
          setError(preferencesSaveError(saveError));
        }
        return {
          ok: false,
          error: normalizeAppError(saveError, 'preference-save'),
        } as const;
      },
    );
    writeQueueRef.current = resultPromise.then(() => undefined);
    return resultPromise;
  }, []);

  const value = useMemo(
    () => ({
      preferences,
      loading,
      error,
      refresh,
      resetPreferences,
      setPreference,
    }),
    [error, loading, preferences, refresh, resetPreferences, setPreference],
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
