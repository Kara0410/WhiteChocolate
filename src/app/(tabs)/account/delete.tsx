import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { AccountPlaceholderScreen } from '@/components/account/account-placeholder-screen';
import { useFavoriteParking } from '@/context/FavoriteParkingContext';
import { useOnboarding } from '@/context/OnboardingContext';
import { usePreferences } from '@/context/PreferencesContext';
import { useAccount } from '@/hooks/use-account';

type DeletionStep = 'idle' | 'confirm' | 'done';

function BulletLine({ text }: { text: string }) {
  return (
    <View className="mt-2 flex-row">
      <Text className="text-[13px] font-semibold leading-5 text-slate-400">
        {'-'}
      </Text>
      <Text className="ml-2 flex-1 text-[13px] font-semibold leading-5 text-slate-500">
        {text}
      </Text>
    </View>
  );
}

export default function AccountDeleteScreen() {
  const router = useRouter();
  const account = useAccount();
  const { clearFavorites, favoriteItems } = useFavoriteParking();
  const { resetOnboarding } = useOnboarding();
  const { resetPreferences } = usePreferences();
  const [localStep, setLocalStep] = useState<DeletionStep>('idle');
  const [accountStep, setAccountStep] = useState<DeletionStep>('idle');
  const [confirmation, setConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isClearingLocal, setIsClearingLocal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cleanupWarning, setCleanupWarning] = useState<string | null>(null);

  const handleConfirmLocalDelete = useCallback(async () => {
    if (isClearingLocal) {
      return;
    }

    setIsClearingLocal(true);
    setError(null);
    try {
      const [favoritesResult, preferencesResult] = await Promise.all([
        clearFavorites(),
        resetPreferences(),
      ]);

      if (!favoritesResult.ok || !preferencesResult.ok) {
        setError(
          'Some local data could not be deleted. Please try again.',
        );
        return;
      }

      setLocalStep('done');
    } finally {
      setIsClearingLocal(false);
    }
  }, [clearFavorites, isClearingLocal, resetPreferences]);

  const handleConfirmAccountDelete = useCallback(async () => {
    if (isDeleting || confirmation !== 'DELETE' || !account.isSignedIn) {
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

    setConfirmation('');
    setAccountStep('done');
    setIsDeleting(false);
  }, [
    account,
    clearFavorites,
    confirmation,
    isDeleting,
    resetOnboarding,
    resetPreferences,
  ]);

  const continueAfterAccountDelete = useCallback(() => {
    router.replace('/onboarding');
  }, [router]);

  const favoriteCount = favoriteItems.length;
  const accountDeleted = accountStep === 'done';

  return (
    <AccountPlaceholderScreen
      description={
        accountDeleted
          ? 'Your account has been deleted. You can continue using the app as a guest.'
          : account.isSignedIn
            ? 'Manage local app data or permanently delete your account and its server data.'
            : 'Delete data stored by this app on this device.'
      }
      title="Data controls"
    >
      {accountDeleted ? (
        <View accessibilityRole="alert">
          <Text className="text-[15px] font-extrabold text-slate-900">
            Account deleted
          </Text>
          <Text className="mt-2 text-[13px] font-semibold leading-5 text-slate-500">
            The server confirmed deletion. You are signed out and can start
            again as a guest.
          </Text>
          {cleanupWarning ? (
            <Text className="mt-3 text-[13px] font-semibold leading-5 text-amber-800">
              {cleanupWarning}
            </Text>
          ) : null}
          <Pressable
            accessibilityLabel="Continue as guest"
            accessibilityRole="button"
            className="mt-5 min-h-12 items-center justify-center rounded-full bg-blue-600 active:bg-blue-700"
            onPress={continueAfterAccountDelete}
            style={{ borderCurve: 'continuous' }}
          >
            <Text className="text-[15px] font-extrabold text-white">
              Continue as guest
            </Text>
          </Pressable>
        </View>
      ) : (
        <>
          {error ? (
            <Text
              accessibilityRole="alert"
              className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-semibold leading-5 text-red-800"
            >
              {error}
            </Text>
          ) : null}

          <Text className="text-[15px] font-extrabold text-slate-900">
            Delete local data
          </Text>
          <Text className="mt-2 text-[13px] font-semibold leading-5 text-slate-500">
            This separate action deletes data stored on this device:
          </Text>
          <BulletLine
            text={`Favorite parking areas (${favoriteCount.toLocaleString()} saved)`}
          />
          <BulletLine text="Preferences, reset to their defaults" />

          {localStep === 'confirm' ? (
            <>
              <Text className="mt-5 text-[13px] font-bold leading-5 text-red-700">
                This cannot be undone.
              </Text>
              <Pressable
                accessibilityLabel="Confirm delete local data"
                accessibilityRole="button"
                className={`mt-4 min-h-12 items-center justify-center rounded-full ${
                  isClearingLocal ? 'bg-red-300' : 'bg-red-600 active:bg-red-700'
                }`}
                disabled={isClearingLocal}
                onPress={() => {
                  void handleConfirmLocalDelete();
                }}
                style={{ borderCurve: 'continuous' }}
              >
                <Text className="text-[15px] font-extrabold text-white">
                  {isClearingLocal ? 'Deleting local data' : 'Delete local data'}
                </Text>
              </Pressable>
              <Pressable
                accessibilityLabel="Cancel local data deletion"
                accessibilityRole="button"
                className="mt-3 min-h-12 items-center justify-center rounded-full bg-slate-200 active:bg-slate-300"
                onPress={() => setLocalStep('idle')}
                style={{ borderCurve: 'continuous' }}
              >
                <Text className="text-[15px] font-extrabold text-slate-700">
                  Cancel
                </Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              accessibilityLabel="Delete local data"
              accessibilityRole="button"
              className="mt-5 min-h-12 items-center justify-center rounded-full bg-red-600 active:bg-red-700"
              onPress={() => setLocalStep('confirm')}
              style={{ borderCurve: 'continuous' }}
            >
              <Text className="text-[15px] font-extrabold text-white">
                {localStep === 'done' ? 'Delete local data again' : 'Delete local data'}
              </Text>
            </Pressable>
          )}

          {localStep === 'done' ? (
            <Text className="mt-3 text-[13px] font-semibold leading-5 text-emerald-700">
              Local favorites and preferences were deleted.
            </Text>
          ) : null}

          {account.isSignedIn ? (
            <View className="mt-8 border-t border-slate-200 pt-6">
              <Text className="text-[15px] font-extrabold text-slate-900">
                Permanently delete account
              </Text>
              <Text className="mt-2 text-[13px] font-semibold leading-5 text-slate-500">
                This permanently deletes your authenticated account and its
                server data. Subscriptions are not cancelled by this action.
              </Text>
              <BulletLine text="Your profile, favorites, preferences, and consent records" />
              <BulletLine text="Your authentication account" />

              {accountStep === 'confirm' ? (
                <>
                  <Text className="mt-5 text-[13px] font-bold leading-5 text-red-700">
                    Type DELETE to confirm. This action is permanent.
                  </Text>
                  <TextInput
                    accessibilityLabel="Type DELETE to confirm account deletion"
                    autoCapitalize="characters"
                    autoCorrect={false}
                    className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[15px] font-bold text-slate-900"
                    editable={!isDeleting}
                    onChangeText={setConfirmation}
                    placeholder="DELETE"
                    placeholderTextColor="#94A3B8"
                    value={confirmation}
                  />
                  <Pressable
                    accessibilityLabel="Confirm permanent account deletion"
                    accessibilityRole="button"
                    className={`mt-4 min-h-12 flex-row items-center justify-center rounded-full ${
                      isDeleting || confirmation !== 'DELETE'
                        ? 'bg-red-300'
                        : 'bg-red-700 active:bg-red-800'
                    }`}
                    disabled={
                      isDeleting || confirmation !== 'DELETE'
                    }
                    onPress={() => {
                      void handleConfirmAccountDelete();
                    }}
                    style={{ borderCurve: 'continuous' }}
                  >
                    {isDeleting ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : null}
                    <Text className="text-[15px] font-extrabold text-white">
                      {isDeleting ? 'Deleting account' : 'Delete account permanently'}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityLabel="Cancel account deletion"
                    accessibilityRole="button"
                    className="mt-3 min-h-12 items-center justify-center rounded-full bg-slate-200 active:bg-slate-300"
                    disabled={isDeleting}
                    onPress={() => {
                      setAccountStep('idle');
                      setConfirmation('');
                    }}
                    style={{ borderCurve: 'continuous' }}
                  >
                    <Text className="text-[15px] font-extrabold text-slate-700">
                      Cancel
                    </Text>
                  </Pressable>
                </>
              ) : (
                <Pressable
                  accessibilityLabel="Delete account permanently"
                  accessibilityRole="button"
                  className="mt-5 min-h-12 items-center justify-center rounded-full bg-red-700 active:bg-red-800"
                  onPress={() => setAccountStep('confirm')}
                  style={{ borderCurve: 'continuous' }}
                >
                  <Text className="text-[15px] font-extrabold text-white">
                    Delete account permanently
                  </Text>
                </Pressable>
              )}
            </View>
          ) : null}
        </>
      )}
    </AccountPlaceholderScreen>
  );
}
