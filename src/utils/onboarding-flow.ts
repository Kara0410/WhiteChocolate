import type { ParkingCoordinates } from '@/types/parking-map';

export type OnboardingStepId = 'welcome' | 'location' | 'account' | 'ready';
export type AccountMode = 'choice' | 'login' | 'register' | 'guest';
export type GoogleAuthMode = Exclude<AccountMode, 'guest'>;

export type GoogleAuthCopy = {
  actionLabel: string;
  loadingLabel: string;
  separatorLabel: string;
};

const GOOGLE_AUTH_COPY: Record<GoogleAuthMode, GoogleAuthCopy> = {
  choice: {
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

export function getGoogleAuthCopy(accountMode: GoogleAuthMode): GoogleAuthCopy {
  return GOOGLE_AUTH_COPY[accountMode];
}

export type OnboardingFlowStep = {
  id: OnboardingStepId;
};

export function getOnboardingStepIndex(
  stepId: OnboardingStepId,
  steps: OnboardingFlowStep[],
) {
  return steps.findIndex((step) => step.id === stepId);
}

export function getNextOnboardingStep(
  stepId: OnboardingStepId,
  steps: OnboardingFlowStep[],
): OnboardingStepId | null {
  const currentIndex = getOnboardingStepIndex(stepId, steps);

  if (currentIndex < 0 || currentIndex >= steps.length - 1) {
    return null;
  }

  return steps[currentIndex + 1]?.id ?? null;
}

export function getPreviousOnboardingStep(
  stepId: OnboardingStepId,
  steps: OnboardingFlowStep[],
): OnboardingStepId | null {
  const currentIndex = getOnboardingStepIndex(stepId, steps);

  if (currentIndex <= 0) {
    return null;
  }

  return steps[currentIndex - 1]?.id ?? null;
}

export type LocationStepDecision = {
  shouldAdvance: boolean;
  shouldLocateOnEntry: boolean;
};

export type BackNavigationDecision =
  | {
      action: 'stay';
      stepId: OnboardingStepId;
      accountMode: AccountMode;
    }
  | {
      action: 'previous-step';
      stepId: OnboardingStepId;
      accountMode: AccountMode;
    }
  | {
      action: 'account-choice';
      stepId: 'account';
      accountMode: AccountMode;
    };

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
  activeStepId,
  steps,
}: {
  accountMode: AccountMode;
  activeStepId: OnboardingStepId;
  steps: OnboardingFlowStep[];
}): BackNavigationDecision {
  const currentStep = steps.find((step) => step.id === activeStepId);

  if (!currentStep) {
    return {
      action: 'stay',
      stepId: steps[0]?.id ?? activeStepId,
      accountMode,
    };
  }

  if (
    currentStep?.id === 'account' &&
    (accountMode === 'login' ||
      accountMode === 'register' ||
      accountMode === 'guest')
  ) {
    return {
      action: 'account-choice',
      stepId: 'account',
      accountMode: 'choice',
    };
  }

  const previousStepId = getPreviousOnboardingStep(activeStepId, steps);

  if (previousStepId === null) {
    return {
      action: 'stay',
      stepId: currentStep.id,
      accountMode,
    };
  }

  return {
    action: 'previous-step',
    stepId: previousStepId,
    accountMode: 'choice',
  };
}
