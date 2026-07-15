import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getBackNavigationDecision,
  getContinueWithoutLocationDecision,
  getGoogleAuthCopy,
  getNextOnboardingStep,
  getOnboardingStepIndex,
  getPreviousOnboardingStep,
  getRequestedLocationDecision,
  type OnboardingFlowStep,
} from '../src/utils/onboarding-flow';
import {
  getGoogleCallbackNavigation,
  getGoogleCallbackProcessingDecision,
} from '../src/utils/google-auth-callback';

const signedOutSteps: OnboardingFlowStep[] = [
  { id: 'welcome' },
  { id: 'location' },
  { id: 'account' },
  { id: 'ready' },
];

const signedInSteps: OnboardingFlowStep[] = [
  { id: 'welcome' },
  { id: 'location' },
  { id: 'ready' },
];

test('location result decisions only advance for valid coordinates', () => {
  assert.deepEqual(
    getRequestedLocationDecision({
      latitude: 48.1351,
      longitude: 11.582,
    }),
    {
      shouldAdvance: true,
      shouldLocateOnEntry: true,
    },
  );

  assert.deepEqual(getRequestedLocationDecision(null), {
    shouldAdvance: false,
    shouldLocateOnEntry: false,
  });
});

test('continue without location advances explicitly without locating on entry', () => {
  assert.deepEqual(getContinueWithoutLocationDecision(), {
    shouldAdvance: true,
    shouldLocateOnEntry: false,
  });
});

test('Google authentication copy matches the current account mode', () => {
  assert.deepEqual(getGoogleAuthCopy('choice'), {
    actionLabel: 'Continue with Google',
    loadingLabel: 'Connecting to Google',
    separatorLabel: 'or continue with email',
  });
  assert.deepEqual(getGoogleAuthCopy('login'), {
    actionLabel: 'Sign in with Google',
    loadingLabel: 'Signing in with Google',
    separatorLabel: 'or sign in with email',
  });
  assert.deepEqual(getGoogleAuthCopy('register'), {
    actionLabel: 'Sign up with Google',
    loadingLabel: 'Signing up with Google',
    separatorLabel: 'or sign up with email',
  });
});

test('Google callback navigation prefers history and otherwise follows onboarding state', () => {
  assert.equal(
    getGoogleCallbackNavigation({
      canGoBack: true,
      shouldShowOnboarding: false,
    }),
    'back',
  );
  assert.equal(
    getGoogleCallbackNavigation({
      canGoBack: false,
      shouldShowOnboarding: true,
    }),
    'onboarding',
  );
  assert.equal(
    getGoogleCallbackNavigation({
      canGoBack: false,
      shouldShowOnboarding: false,
    }),
    'map',
  );
});

test('Google callback processing waits for hydration and active OAuth operations', () => {
  const base = {
    accountLoading: false,
    accountStatus: 'anonymous' as const,
    callbackUrl: 'whitechoclate://auth/callback#access_token=a',
    hasObservedOAuthOperation: false,
    hasProcessedCallback: false,
    isSignedIn: false,
    onboardingHydrated: true,
  };

  assert.equal(
    getGoogleCallbackProcessingDecision({
      ...base,
      accountLoading: true,
    }),
    'wait',
  );
  assert.equal(
    getGoogleCallbackProcessingDecision({
      ...base,
      accountStatus: 'signingIn',
    }),
    'wait',
  );
  assert.equal(
    getGoogleCallbackProcessingDecision({
      ...base,
      hasObservedOAuthOperation: true,
    }),
    'error',
  );
  assert.equal(
    getGoogleCallbackProcessingDecision({
      ...base,
      isSignedIn: true,
    }),
    'navigate',
  );
  assert.equal(
    getGoogleCallbackProcessingDecision({
      ...base,
      callbackUrl: null,
    }),
    'error',
  );
  assert.equal(
    getGoogleCallbackProcessingDecision(base),
    'process',
  );
});

test('back navigation stays on the first onboarding step', () => {
  assert.deepEqual(
    getBackNavigationDecision({
      accountMode: 'choice',
      activeStepId: 'welcome',
      steps: signedOutSteps,
    }),
    {
      action: 'stay',
      stepId: 'welcome',
      accountMode: 'choice',
    },
  );
});

test('back navigation follows signed-out onboarding steps', () => {
  assert.deepEqual(
    getBackNavigationDecision({
      accountMode: 'choice',
      activeStepId: 'location',
      steps: signedOutSteps,
    }),
    {
      action: 'previous-step',
      stepId: 'welcome',
      accountMode: 'choice',
    },
  );

  assert.deepEqual(
    getBackNavigationDecision({
      accountMode: 'choice',
      activeStepId: 'account',
      steps: signedOutSteps,
    }),
    {
      action: 'previous-step',
      stepId: 'location',
      accountMode: 'choice',
    },
  );

  assert.deepEqual(
    getBackNavigationDecision({
      accountMode: 'choice',
      activeStepId: 'ready',
      steps: signedOutSteps,
    }),
    {
      action: 'previous-step',
      stepId: 'account',
      accountMode: 'choice',
    },
  );
});

test('back navigation returns auth and guest modes to account choice first', () => {
  for (const accountMode of ['login', 'register', 'guest'] as const) {
    assert.deepEqual(
      getBackNavigationDecision({
        accountMode,
        activeStepId: 'account',
        steps: signedOutSteps,
      }),
      {
        action: 'account-choice',
        stepId: 'account',
        accountMode: 'choice',
      },
    );
  }
});

test('signed-in back navigation does not assume the account step exists', () => {
  assert.deepEqual(
    getBackNavigationDecision({
      accountMode: 'choice',
      activeStepId: 'ready',
      steps: signedInSteps,
    }),
    {
      action: 'previous-step',
      stepId: 'location',
      accountMode: 'choice',
    },
  );
});

test('semantic navigation follows the configured stage IDs', () => {
  assert.equal(getOnboardingStepIndex('account', signedOutSteps), 2);
  assert.equal(getNextOnboardingStep('welcome', signedOutSteps), 'location');
  assert.equal(getNextOnboardingStep('location', signedOutSteps), 'account');
  assert.equal(getNextOnboardingStep('account', signedOutSteps), 'ready');
  assert.equal(getPreviousOnboardingStep('ready', signedOutSteps), 'account');
  assert.equal(getNextOnboardingStep('ready', signedOutSteps), null);
});

test('signed-in onboarding keeps welcome and removes only the account stage', () => {
  assert.equal(signedInSteps[0]?.id, 'welcome');
  assert.deepEqual(
    signedInSteps.map((step) => step.id),
    ['welcome', 'location', 'ready'],
  );
});
