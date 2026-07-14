import assert from 'node:assert/strict';
import test from 'node:test';

import {
  clampOnboardingIndex,
  getBackNavigationDecision,
  getContinueWithoutLocationDecision,
  getGoogleAuthCopy,
  getRequestedLocationDecision,
  type OnboardingFlowStep,
} from '../src/utils/onboarding-flow';

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
  assert.deepEqual(getGoogleAuthCopy('benefit'), {
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

test('back navigation stays on welcome', () => {
  assert.deepEqual(
    getBackNavigationDecision({
      accountMode: 'benefit',
      activeIndex: 0,
      steps: signedOutSteps,
    }),
    {
      action: 'stay',
      activeIndex: 0,
      accountMode: 'benefit',
    },
  );
});

test('back navigation follows signed-out onboarding steps', () => {
  assert.deepEqual(
    getBackNavigationDecision({
      accountMode: 'benefit',
      activeIndex: 1,
      steps: signedOutSteps,
    }),
    {
      action: 'previous-step',
      activeIndex: 0,
      accountMode: 'benefit',
    },
  );

  assert.deepEqual(
    getBackNavigationDecision({
      accountMode: 'benefit',
      activeIndex: 2,
      steps: signedOutSteps,
    }),
    {
      action: 'previous-step',
      activeIndex: 1,
      accountMode: 'benefit',
    },
  );

  assert.deepEqual(
    getBackNavigationDecision({
      accountMode: 'benefit',
      activeIndex: 3,
      steps: signedOutSteps,
    }),
    {
      action: 'previous-step',
      activeIndex: 2,
      accountMode: 'benefit',
    },
  );
});

test('back navigation returns login and register modes to account benefits first', () => {
  assert.deepEqual(
    getBackNavigationDecision({
      accountMode: 'login',
      activeIndex: 2,
      steps: signedOutSteps,
    }),
    {
      action: 'account-benefit',
      activeIndex: 2,
      accountMode: 'benefit',
    },
  );

  assert.deepEqual(
    getBackNavigationDecision({
      accountMode: 'register',
      activeIndex: 2,
      steps: signedOutSteps,
    }),
    {
      action: 'account-benefit',
      activeIndex: 2,
      accountMode: 'benefit',
    },
  );
});

test('signed-in back navigation does not assume the account step exists', () => {
  assert.deepEqual(
    getBackNavigationDecision({
      accountMode: 'benefit',
      activeIndex: 2,
      steps: signedInSteps,
    }),
    {
      action: 'previous-step',
      activeIndex: 1,
      accountMode: 'benefit',
    },
  );
});

test('active onboarding index is clamped when the steps array changes', () => {
  assert.equal(clampOnboardingIndex(4, signedInSteps.length), 2);
  assert.equal(clampOnboardingIndex(-1, signedInSteps.length), 0);
  assert.equal(clampOnboardingIndex(0, 0), 0);
});

test('removing the account step advances its index to ready without another navigation', () => {
  const accountStepIndex = 2;
  const nextIndex = clampOnboardingIndex(
    accountStepIndex,
    signedInSteps.length,
  );

  assert.equal(nextIndex, 2);
  assert.equal(signedInSteps[nextIndex]?.id, 'ready');
});
