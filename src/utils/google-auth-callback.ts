import type { AuthStatus } from '@/types/account';

export type GoogleCallbackNavigation = 'back' | 'onboarding' | 'map';

export function getGoogleCallbackNavigation({
  canGoBack,
  shouldShowOnboarding,
}: {
  canGoBack: boolean;
  shouldShowOnboarding: boolean;
}): GoogleCallbackNavigation {
  if (canGoBack) {
    return 'back';
  }

  return shouldShowOnboarding ? 'onboarding' : 'map';
}

export type GoogleCallbackProcessingDecision =
  | 'wait'
  | 'navigate'
  | 'process'
  | 'error';

export function getGoogleCallbackProcessingDecision({
  accountLoading,
  accountStatus,
  callbackUrl,
  hasObservedOAuthOperation,
  hasProcessedCallback,
  isSignedIn,
  onboardingHydrated,
}: {
  accountLoading: boolean;
  accountStatus: AuthStatus;
  callbackUrl: string | null;
  hasObservedOAuthOperation: boolean;
  hasProcessedCallback: boolean;
  isSignedIn: boolean;
  onboardingHydrated: boolean;
}): GoogleCallbackProcessingDecision {
  if (hasProcessedCallback || accountLoading || !onboardingHydrated) {
    return 'wait';
  }

  if (accountStatus === 'signingIn') {
    return 'wait';
  }

  if (isSignedIn) {
    return 'navigate';
  }

  if (hasObservedOAuthOperation || !callbackUrl) {
    return 'error';
  }

  return 'process';
}
