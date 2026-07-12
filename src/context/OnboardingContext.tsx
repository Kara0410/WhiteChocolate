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
import { ActivityIndicator, Text, View } from 'react-native';

import { APP_DISPLAY_NAME } from '@/constants/app';
import {
  clearOnboardingState,
  createCompletedOnboardingState,
  DEFAULT_ONBOARDING_STATE,
  loadOnboardingState,
  saveOnboardingState,
  shouldShowOnboardingForState,
  type OnboardingState,
} from '@/utils/onboarding-state';

type OnboardingActionResult =
  | { ok: true }
  | { ok: false; error: unknown };

type OnboardingContextValue = {
  isHydrated: boolean;
  shouldShowOnboarding: boolean;
  onboardingState: OnboardingState;
  completeOnboarding: () => Promise<OnboardingActionResult>;
  resetOnboardingForDev: () => void;
  markAccountSkipped: () => void;
  markVehicleSkipped: () => void;
  markMapTipSeen: () => void;
  markFavoritesTipSeen: () => void;
  markGarageTipSeen: () => void;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(
  null,
);

export function OnboardingLoadingScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-slate-100 px-6">
      <View
        className="w-full max-w-[320px] items-center rounded-[28px] border border-white/80 bg-white p-6"
        style={{
          borderCurve: 'continuous',
          boxShadow: '0 4px 12px rgba(15,23,42,0.06)',
        }}
      >
        <ActivityIndicator color="#2563EB" size="large" />
        <Text className="mt-4 text-[15px] font-extrabold text-slate-900">
          Preparing {APP_DISPLAY_NAME}
        </Text>
        <Text className="mt-2 text-center text-[13px] font-semibold leading-5 text-slate-500">
          Loading your setup.
        </Text>
      </View>
    </View>
  );
}

export function OnboardingProvider({ children }: PropsWithChildren) {
  const [onboardingState, setOnboardingState] = useState(
    DEFAULT_ONBOARDING_STATE,
  );
  const [isHydrated, setIsHydrated] = useState(false);
  const isMountedRef = useRef(true);
  const onboardingStateRef = useRef(DEFAULT_ONBOARDING_STATE);
  const writeQueueRef = useRef(Promise.resolve());

  useEffect(() => {
    isMountedRef.current = true;

    loadOnboardingState()
      .then((storedState) => {
        if (isMountedRef.current) {
          onboardingStateRef.current = storedState;
          setOnboardingState(storedState);
        }
      })
      .catch(() => {
        if (isMountedRef.current) {
          setOnboardingState(DEFAULT_ONBOARDING_STATE);
        }
      })
      .finally(() => {
        if (isMountedRef.current) {
          setIsHydrated(true);
        }
      });

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const enqueueWrite = useCallback(
    async (
      write: () => Promise<void>,
      logMessage: string,
    ): Promise<OnboardingActionResult> => {
      const writePromise = writeQueueRef.current.then(write);
      const resultPromise = writePromise.then(
        () => ({ ok: true }) as const,
        (error: unknown) => {
          if (__DEV__) {
            console.warn(logMessage, error);
          }

          return { ok: false, error } as const;
        },
      );

      writeQueueRef.current = resultPromise.then(() => undefined);
      return resultPromise;
    },
    [],
  );

  const persist = useCallback((nextState: OnboardingState) => {
    void enqueueWrite(
      () => saveOnboardingState(nextState),
      '[OnboardingProvider] failed to save onboarding state',
    );
  }, [enqueueWrite]);

  const applyOnboardingState = useCallback((nextState: OnboardingState) => {
    onboardingStateRef.current = nextState;

    if (isMountedRef.current) {
      setOnboardingState(nextState);
    }
  }, []);

  const updateState = useCallback(
    (updater: (current: OnboardingState) => OnboardingState) => {
      const current = onboardingStateRef.current;
      const nextState = updater(current);

      if (nextState === current) {
        return;
      }

      onboardingStateRef.current = nextState;
      persist(nextState);

      if (isMountedRef.current) {
        setOnboardingState(nextState);
      }
    },
    [persist],
  );

  const completeOnboarding = useCallback(async () => {
    const completedState = createCompletedOnboardingState(
      onboardingStateRef.current,
    );
    const result = await enqueueWrite(
      () => saveOnboardingState(completedState),
      '[OnboardingProvider] failed to complete onboarding',
    );

    if (!result.ok) {
      return result;
    }

    applyOnboardingState(completedState);
    return { ok: true } as const;
  }, [applyOnboardingState, enqueueWrite]);

  const resetOnboardingForDev = useCallback(() => {
    applyOnboardingState(DEFAULT_ONBOARDING_STATE);
    void enqueueWrite(
      () => clearOnboardingState(),
      '[OnboardingProvider] failed to clear onboarding state',
    );
  }, [applyOnboardingState, enqueueWrite]);

  const markAccountSkipped = useCallback(() => {
    updateState((current) =>
      current.skippedAccount
        ? current
        : { ...current, skippedAccount: true },
    );
  }, [updateState]);

  const markVehicleSkipped = useCallback(() => {
    updateState((current) =>
      current.skippedVehicle
        ? current
        : { ...current, skippedVehicle: true },
    );
  }, [updateState]);

  const markMapTipSeen = useCallback(() => {
    updateState((current) =>
      current.hasSeenMapTip
        ? current
        : { ...current, hasSeenMapTip: true },
    );
  }, [updateState]);

  const markFavoritesTipSeen = useCallback(() => {
    updateState((current) =>
      current.hasSeenFavoritesTip
        ? current
        : { ...current, hasSeenFavoritesTip: true },
    );
  }, [updateState]);

  const markGarageTipSeen = useCallback(() => {
    updateState((current) =>
      current.hasSeenGarageTip
        ? current
        : { ...current, hasSeenGarageTip: true },
    );
  }, [updateState]);

  const shouldShowOnboarding = useMemo(
    () => shouldShowOnboardingForState(onboardingState),
    [onboardingState],
  );

  const value = useMemo(
    () => ({
      isHydrated,
      shouldShowOnboarding,
      onboardingState,
      completeOnboarding,
      resetOnboardingForDev,
      markAccountSkipped,
      markVehicleSkipped,
      markMapTipSeen,
      markFavoritesTipSeen,
      markGarageTipSeen,
    }),
    [
      completeOnboarding,
      isHydrated,
      markAccountSkipped,
      markFavoritesTipSeen,
      markGarageTipSeen,
      markMapTipSeen,
      markVehicleSkipped,
      onboardingState,
      resetOnboardingForDev,
      shouldShowOnboarding,
    ],
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const value = useContext(OnboardingContext);

  if (value === null) {
    throw new Error(
      'useOnboarding must be used within OnboardingProvider',
    );
  }

  return value;
}
