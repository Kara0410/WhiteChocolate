import AsyncStorage from '@react-native-async-storage/async-storage';

import type { KeyValueStorage } from '@/types/storage';

export const ONBOARDING_VERSION = 1;
export const ONBOARDING_STORAGE_KEY = '@white-choclate/onboarding/v1';

export type OnboardingState = {
  hasCompletedOnboarding: boolean;
  completedVersion: number;
  completedAt: string | null;
  skippedAccount: boolean;
  skippedVehicle: boolean;
  hasSeenMapTip: boolean;
  hasSeenFavoritesTip: boolean;
  hasSeenGarageTip: boolean;
};

export type OnboardingCompletionResult =
  | { ok: true; state: OnboardingState }
  | { ok: false; error: unknown };

export const DEFAULT_ONBOARDING_STATE: OnboardingState = {
  hasCompletedOnboarding: false,
  completedVersion: 0,
  completedAt: null,
  skippedAccount: false,
  skippedVehicle: false,
  hasSeenMapTip: false,
  hasSeenFavoritesTip: false,
  hasSeenGarageTip: false,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function booleanOrDefault(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback;
}

function numberOrDefault(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : fallback;
}

function stringOrNullOrDefault(
  value: unknown,
  fallback: string | null,
) {
  return typeof value === 'string' || value === null ? value : fallback;
}

export function normalizeStoredOnboardingState(
  value: unknown,
): OnboardingState {
  if (!isRecord(value)) {
    return DEFAULT_ONBOARDING_STATE;
  }

  return {
    hasCompletedOnboarding: booleanOrDefault(
      value.hasCompletedOnboarding,
      DEFAULT_ONBOARDING_STATE.hasCompletedOnboarding,
    ),
    completedVersion: Math.max(
      0,
      numberOrDefault(
        value.completedVersion,
        DEFAULT_ONBOARDING_STATE.completedVersion,
      ),
    ),
    completedAt: stringOrNullOrDefault(
      value.completedAt,
      DEFAULT_ONBOARDING_STATE.completedAt,
    ),
    skippedAccount: booleanOrDefault(
      value.skippedAccount,
      DEFAULT_ONBOARDING_STATE.skippedAccount,
    ),
    skippedVehicle: booleanOrDefault(
      value.skippedVehicle,
      DEFAULT_ONBOARDING_STATE.skippedVehicle,
    ),
    hasSeenMapTip: booleanOrDefault(
      value.hasSeenMapTip,
      DEFAULT_ONBOARDING_STATE.hasSeenMapTip,
    ),
    hasSeenFavoritesTip: booleanOrDefault(
      value.hasSeenFavoritesTip,
      DEFAULT_ONBOARDING_STATE.hasSeenFavoritesTip,
    ),
    hasSeenGarageTip: booleanOrDefault(
      value.hasSeenGarageTip,
      DEFAULT_ONBOARDING_STATE.hasSeenGarageTip,
    ),
  };
}

export function shouldShowOnboardingForState(
  state: OnboardingState,
  version = ONBOARDING_VERSION,
) {
  return (
    !state.hasCompletedOnboarding || state.completedVersion < version
  );
}

export function createCompletedOnboardingState(
  current: OnboardingState,
  completedAt = new Date().toISOString(),
): OnboardingState {
  return {
    ...current,
    hasCompletedOnboarding: true,
    completedVersion: ONBOARDING_VERSION,
    completedAt,
  };
}

export async function loadOnboardingState(
  storage: KeyValueStorage = AsyncStorage,
): Promise<OnboardingState> {
  const storedValue = await storage.getItem(ONBOARDING_STORAGE_KEY);

  if (storedValue === null) {
    return DEFAULT_ONBOARDING_STATE;
  }

  try {
    return normalizeStoredOnboardingState(JSON.parse(storedValue));
  } catch {
    return DEFAULT_ONBOARDING_STATE;
  }
}

export async function saveOnboardingState(
  state: OnboardingState,
  storage: KeyValueStorage = AsyncStorage,
): Promise<void> {
  await storage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(state));
}

export async function saveCompletedOnboardingState(
  current: OnboardingState,
  storage: KeyValueStorage = AsyncStorage,
  completedAt = new Date().toISOString(),
): Promise<OnboardingCompletionResult> {
  const completedState = createCompletedOnboardingState(
    current,
    completedAt,
  );

  try {
    await saveOnboardingState(completedState, storage);
    return { ok: true, state: completedState };
  } catch (error) {
    return { ok: false, error };
  }
}

export async function clearOnboardingState(
  storage: KeyValueStorage = AsyncStorage,
): Promise<void> {
  await storage.removeItem(ONBOARDING_STORAGE_KEY);
}
