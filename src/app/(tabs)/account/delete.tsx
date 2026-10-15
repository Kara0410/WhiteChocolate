import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { AccountPlaceholderScreen } from '@/components/account/account-placeholder-screen';
import { useFavoriteParking } from '@/context/FavoriteParkingContext';
import { useOnboarding } from '@/context/OnboardingContext';
import { usePreferences } from '@/context/PreferencesContext';
import { useAccount } from '@/hooks/use-account';
import { COLORS } from '@/constants/theme';

type DeletionStep = 'overview' | 'confirm' | 'done';

function Consequence({ children }: { children: string }) {
  return (
    <View className="mt-2 flex-row">
      <Text className="text-[13px] font-semibold leading-5 text-feedback-error">
        {'•'}
      </Text>
      <Text className="ml-2 flex-1 text-[13px] font-semibold leading-5 text-ink-secondary">
        {children}
      </Text>
    </View>
  );
}

export default function AccountDeleteScreen() {
  const router = useRouter();
  const account = useAccount();
  const { clearFavorites } = useFavoriteParking();
  const { resetOnboarding } = useOnboarding();
  const { resetPreferences } = usePreferences();
  const [step, setStep] = useState<DeletionStep>('overview');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cleanupWarning, setCleanupWarning] = useState<string | null>(null);

  const handleDelete = useCallback(async () => {
    if (isDeleting || step !== 'confirm' || !account.isSignedIn) {
      return;
    }

    setIsDeleting(true);
    setError(null);
    setCleanupWarning(null);

    const result = await account.deleteAccount();
    if (!result.ok) {
      setError(result.error.message);
      setIsDeleting(false);
      return;
    }

    const [favoritesResult, preferencesResult, onboardingResult] =
      await Promise.all([
        clearFavorites(),
        resetPreferences(),
        resetOnboarding(),
      ]);

    if (
      !favoritesResult.ok ||
      !preferencesResult.ok ||
      !onboardingResult.ok
    ) {
      setCleanupWarning(
        'Your account was deleted, but some data on this device could not be cleared. Restart the app and try the local data controls again.',
      );
    }

    setStep('done');
    setIsDeleting(false);
  }, [
    account,
    clearFavorites,
    isDeleting,
    resetOnboarding,
    resetPreferences,
    step,
  ]);

  const continueAfterDeletion = useCallback(() => {
    router.replace('/onboarding');
  }, [router]);

  return (
    <AccountPlaceholderScreen
      description={
        step === 'done'
          ? 'Your account has been deleted. You can continue using the app without an account.'
          : 'Permanently remove your account and account data. This cannot be undone.'
      }
      title="Delete account"
    >
      {step === 'done' ? (
        <View accessibilityRole="alert">
          <Text className="text-[17px] font-extrabold text-ink-primary">
            Account deleted
          </Text>
          <Text className="mt-2 text-[13px] font-semibold leading-5 text-ink-secondary">
            You are signed out and can continue using the app without an
            account.
          </Text>
          {cleanupWarning ? (
            <Text className="mt-3 text-[13px] font-semibold leading-5 text-status-limited">
              {cleanupWarning}
            </Text>
          ) : null}
          <Pressable
            accessibilityLabel="Continue without an account"
            accessibilityRole="button"
            className="mt-5 min-h-12 items-center justify-center rounded-full bg-accent-primary active:bg-accent-pressed"
            onPress={continueAfterDeletion}
            style={{ borderCurve: 'continuous' }}
          >
            <Text className="text-[15px] font-extrabold text-ink-on-accent">
              Continue
            </Text>
          </Pressable>
        </View>
      ) : !account.isSignedIn && !isDeleting ? (
        <View accessibilityRole="alert">
          <Text className="text-[17px] font-extrabold text-ink-primary">
            Sign in required
          </Text>
          <Text className="mt-2 text-[13px] font-semibold leading-5 text-ink-secondary">
            Sign in to manage and delete your account.
          </Text>
        </View>
      ) : (
        <>
          {error ? (
            <Text
              accessibilityRole="alert"
              className="mb-4 rounded-2xl border border-feedback-error bg-feedback-error-soft px-4 py-3 text-[13px] font-semibold leading-5 text-feedback-error"
            >
              {error}
            </Text>
          ) : null}

          <View className="rounded-2xl border border-feedback-error bg-feedback-error-soft p-4">
            <Text className="text-[15px] font-extrabold text-feedback-error">
              What will be removed
            </Text>
            <Consequence>Your profile and account</Consequence>
            <Consequence>
              Favorites and preferences associated with your account
            </Consequence>
            <Consequence>Other account data stored by the app</Consequence>
          </View>

          {step === 'confirm' ? (
            <>
              <Text className="mt-5 text-[14px] font-extrabold leading-5 text-feedback-error">
                Are you sure? This action cannot be undone.
              </Text>
              <Pressable
                accessibilityLabel="Permanently delete account"
                accessibilityRole="button"
                className={
                  isDeleting
                    ? 'mt-4 min-h-12 flex-row items-center justify-center rounded-full bg-feedback-error-soft'
                    : 'mt-4 min-h-12 flex-row items-center justify-center rounded-full bg-feedback-error active:bg-feedback-error'
                }
                disabled={isDeleting}
                onPress={() => {
                  void handleDelete();
                }}
                style={{ borderCurve: 'continuous' }}
              >
                {isDeleting ? (
                  <ActivityIndicator color={COLORS.surface.default} size="small" />
                ) : null}
                <Text className="text-[15px] font-extrabold text-ink-on-accent">
                  {isDeleting ? 'Deleting account' : 'Delete permanently'}
                </Text>
              </Pressable>
              <Pressable
                accessibilityLabel="Cancel account deletion"
                accessibilityRole="button"
                className="mt-3 min-h-12 items-center justify-center rounded-full bg-background-default active:bg-surface-muted"
                disabled={isDeleting}
                onPress={() => setStep('overview')}
                style={{ borderCurve: 'continuous' }}
              >
                <Text className="text-[15px] font-extrabold text-ink-secondary">
                  Cancel
                </Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              accessibilityHint="Shows a confirmation before deletion"
              accessibilityLabel="Delete account"
              accessibilityRole="button"
              className="mt-5 min-h-12 items-center justify-center rounded-full border border-feedback-error bg-feedback-error-soft active:bg-feedback-error-soft"
              onPress={() => setStep('confirm')}
              style={{ borderCurve: 'continuous' }}
            >
              <Text className="text-[15px] font-extrabold text-feedback-error">
                Delete account
              </Text>
            </Pressable>
          )}
        </>
      )}
    </AccountPlaceholderScreen>
  );
}
