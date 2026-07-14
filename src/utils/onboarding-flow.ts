import type { ParkingCoordinates } from '@/types/parking-map';

export type OnboardingStepId = 'welcome' | 'location' | 'account' | 'ready';
export type AccountMode = 'benefit' | 'login' | 'register';

export type GoogleAuthCopy = {
  actionLabel: string;
  loadingLabel: string;
  separatorLabel: string;
};

const GOOGLE_AUTH_COPY: Record<AccountMode, GoogleAuthCopy> = {
  benefit: {
    actionLabel: 'Continue with Google',
    loadingLabel: 'Connecting to Google',
    separatorLabel: 'or continue with email',
  },
  login: {
    actionLabel: 'Sign in with Google',
    loadingLabel: 'Signing in with Google',
    separatorLabel: 'or sign in with email',
  },
  register: {
    actionLabel: 'Sign up with Google',
    loadingLabel: 'Signing up with Google',
    separatorLabel: 'or sign up with email',
  },
};

export function getGoogleAuthCopy(accountMode: AccountMode): GoogleAuthCopy {
  return GOOGLE_AUTH_COPY[accountMode];
}

export type OnboardingFlowStep = {
  id: OnboardingStepId;
};

export type LocationStepDecision = {
  shouldAdvance: boolean;
  shouldLocateOnEntry: boolean;
};

export type BackNavigationDecision =
  | {
      action: 'stay';
      activeIndex: number;
      accountMode: AccountMode;
    }
  | {
      action: 'previous-step';
      activeIndex: number;
      accountMode: AccountMode;
    }
  | {
      action: 'account-benefit';
      activeIndex: number;
      accountMode: AccountMode;
    };

export function clampOnboardingIndex(
  activeIndex: number,
  stepsLength: number,
) {
  if (stepsLength <= 0) {
    return 0;
  }

  return Math.min(Math.max(activeIndex, 0), stepsLength - 1);
}

export function getRequestedLocationDecision(
  coordinates: ParkingCoordinates | null,
): LocationStepDecision {
  return {
    shouldAdvance: coordinates !== null,
    shouldLocateOnEntry: coordinates !== null,
  };
}

export function getContinueWithoutLocationDecision(): LocationStepDecision {
  return {
    shouldAdvance: true,
    shouldLocateOnEntry: false,
  };
}

export function getBackNavigationDecision({
  accountMode,
  activeIndex,
  steps,
}: {
  accountMode: AccountMode;
  activeIndex: number;
  steps: OnboardingFlowStep[];
}): BackNavigationDecision {
  const currentIndex = clampOnboardingIndex(activeIndex, steps.length);
  const currentStep = steps[currentIndex];

  if (
    currentStep?.id === 'account' &&
    (accountMode === 'login' || accountMode === 'register')
  ) {
    return {
      action: 'account-benefit',
      activeIndex: currentIndex,
      accountMode: 'benefit',
    };
  }

  if (currentIndex <= 0) {
    return {
      action: 'stay',
      activeIndex: currentIndex,
      accountMode,
    };
  }

  return {
    action: 'previous-step',
    activeIndex: currentIndex - 1,
    accountMode: 'benefit',
  };
}
