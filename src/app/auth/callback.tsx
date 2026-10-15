import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Pressable,
  Text,
  View,
} from 'react-native';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';

import { useAccount } from '@/hooks/use-account';
import { useOnboarding } from '@/context/OnboardingContext';
import {
  getGoogleCallbackNavigation,
  getGoogleCallbackProcessingDecision,
} from '@/utils/google-auth-callback';
import { COLORS } from '@/constants/theme';

const CALLBACK_ERROR_MESSAGE =
  'Google sign-in could not finish. Please try again.';

export default function GoogleAuthCallbackScreen() {
  const router = useRouter();
  const account = useAccount();
  const { isHydrated: isOnboardingHydrated, shouldShowOnboarding } =
    useOnboarding();
  const callbackUrl = Linking.useLinkingURL();
  const [callbackError, setCallbackError] = useState<string | null>(null);
  const observedOAuthOperationRef = useRef(false);
  const processedCallbackRef = useRef(false);
  const navigatedRef = useRef(false);

  useEffect(() => {
    if (account.status === 'signingIn') {
      observedOAuthOperationRef.current = true;
    }
  }, [account.status]);

  const navigateAfterAuthentication = useCallback(() => {
    if (navigatedRef.current) {
      return;
    }

    navigatedRef.current = true;
    const navigation = getGoogleCallbackNavigation({
      canGoBack: router.canGoBack(),
      shouldShowOnboarding,
    });

    if (navigation === 'back') {
      router.back();
    } else if (navigation === 'onboarding') {
      router.replace('/onboarding');
    } else {
      router.replace('/map');
    }
  }, [router, shouldShowOnboarding]);

  useEffect(() => {
    if (account.isSignedIn) {
      navigateAfterAuthentication();
    }
  }, [account.isSignedIn, navigateAfterAuthentication]);

  useEffect(() => {
    const decision = getGoogleCallbackProcessingDecision({
      accountLoading: account.loading,
      accountStatus: account.status,
      callbackUrl,
      hasObservedOAuthOperation: observedOAuthOperationRef.current,
      hasProcessedCallback: processedCallbackRef.current,
      isSignedIn: account.isSignedIn,
      onboardingHydrated: isOnboardingHydrated,
    });

    if (decision === 'wait' || decision === 'navigate') {
      return;
    }

    if (decision === 'error') {
      if (
        observedOAuthOperationRef.current &&
        account.error === null
      ) {
        navigateAfterAuthentication();
        return;
      }

      setCallbackError(account.error?.message ?? CALLBACK_ERROR_MESSAGE);
      return;
    }

    processedCallbackRef.current = true;
    void account.completeWithGoogleCallback(callbackUrl!).then((result) => {
      if (!result.ok) {
        if (result.error.code === 'GOOGLE_AUTH_CANCELLED') {
          navigateAfterAuthentication();
          return;
        }

        setCallbackError(result.error.message);
      }
    });
  }, [
    account,
    callbackUrl,
    isOnboardingHydrated,
    navigateAfterAuthentication,
  ]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => callbackError === null,
    );

    return () => subscription.remove();
  }, [callbackError]);

  return (
    <View className="flex-1 items-center justify-center bg-background-default px-6">
      <View className="w-full max-w-[340px] items-center rounded-card border border-border-glass bg-surface-default p-7">
        {callbackError ? (
          <>
            <Text
              accessibilityRole="alert"
              className="text-center text-[15px] font-extrabold leading-6 text-feedback-error"
            >
              {callbackError}
            </Text>
            <Pressable
              accessibilityLabel="Return to onboarding"
              accessibilityRole="button"
              className="mt-6 min-h-12 items-center justify-center rounded-full bg-accent-primary px-6 active:bg-accent-pressed"
              onPress={navigateAfterAuthentication}
            >
              <Text className="text-[15px] font-extrabold text-ink-on-accent">
                Return to onboarding
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <ActivityIndicator
              accessibilityLabel="Completing Google sign-in"
              color={COLORS.accent.primary}
              size="large"
            />
            <Text className="mt-5 text-center text-[15px] font-extrabold text-ink-primary">
              Completing Google sign-in…
            </Text>
          </>
        )}
      </View>
    </View>
  );
}
