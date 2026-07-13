import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AccountPlaceholderScreen } from '@/components/account/account-placeholder-screen';
import { useFavoriteParking } from '@/context/FavoriteParkingContext';
import { usePreferences } from '@/context/PreferencesContext';
import { useAccount } from '@/hooks/use-account';

type DeletionStep = 'idle' | 'confirm' | 'done';

function BulletLine({ text }: { text: string }) {
  return (
    <View className="mt-2 flex-row">
      <Text className="text-[13px] font-semibold leading-5 text-slate-400">
        {'•'}
      </Text>
      <Text className="ml-2 flex-1 text-[13px] font-semibold leading-5 text-slate-500">
        {text}
      </Text>
    </View>
  );
}

export default function AccountDeleteScreen() {
  const account = useAccount();
  const { clearFavorites, favoriteItems } = useFavoriteParking();
  const { resetPreferences } = usePreferences();
  const [step, setStep] = useState<DeletionStep>('idle');

  const handleConfirmDelete = useCallback(() => {
    clearFavorites();
    resetPreferences();
    setStep('done');
  }, [clearFavorites, resetPreferences]);

  const favoriteCount = favoriteItems.length;

  return (
    <AccountPlaceholderScreen
      description={
        account.isSignedIn
          ? 'Delete the data this app stores on this device. Your account is not affected; in-app account deletion is coming later.'
          : 'Delete the data this app stores on this device. No app account is connected.'
      }
      title="Data controls"
    >
      {step === 'done' ? (
        <View accessibilityRole="alert">
          <Text className="text-[15px] font-extrabold text-slate-900">
            Local data deleted
          </Text>
          <Text className="mt-2 text-[13px] font-semibold leading-5 text-slate-500">
            Favorite parking spots were removed from this device, and
            preferences were reset to their defaults.
          </Text>
          {account.isSignedIn ? (
            <Text className="mt-2 text-[13px] font-semibold leading-5 text-slate-500">
              You are still signed in. Signing out was not part of this action.
            </Text>
          ) : null}
        </View>
      ) : (
        <>
          <Text className="text-[15px] font-extrabold text-slate-900">
            Delete local data
          </Text>
          <Text className="mt-2 text-[13px] font-semibold leading-5 text-slate-500">
            This deletes data stored on this device:
          </Text>
          <BulletLine
            text={`Favorite parking spots (${favoriteCount.toLocaleString()} saved)`}
          />
          <BulletLine text="Preferences, reset to their defaults" />

          <Text className="mt-5 text-[13px] font-semibold leading-5 text-slate-500">
            It does not:
          </Text>
          <BulletLine text="Delete a Supabase account or sign you out" />
          <BulletLine text="Cancel any subscriptions" />
          <BulletLine text="Revoke the location permission in system settings" />
          <BulletLine text="Clear data held by parking providers or server logs" />

          {step === 'confirm' ? (
            <>
              <Text
                accessibilityRole="alert"
                className="mt-5 text-[13px] font-bold leading-5 text-red-700"
              >
                This permanently removes the favorite and preference
                data stored on this device. This cannot be undone.
              </Text>
              <Pressable
                accessibilityHint="Permanently deletes favorites and preferences from this device"
                accessibilityLabel="Confirm delete local data"
                accessibilityRole="button"
                className="mt-4 min-h-12 items-center justify-center rounded-full bg-red-600 active:bg-red-700"
                onPress={handleConfirmDelete}
                style={{ borderCurve: 'continuous' }}
              >
                <Text className="text-[15px] font-extrabold text-white">
                  Delete local data
                </Text>
              </Pressable>
              <Pressable
                accessibilityLabel="Cancel"
                accessibilityRole="button"
                className="mt-3 min-h-12 items-center justify-center rounded-full bg-slate-200 active:bg-slate-300"
                onPress={() => setStep('idle')}
                style={{ borderCurve: 'continuous' }}
              >
                <Text className="text-[15px] font-extrabold text-slate-700">
                  Cancel
                </Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              accessibilityHint="Asks for confirmation before deleting local data"
              accessibilityLabel="Delete local data"
              accessibilityRole="button"
              className="mt-5 min-h-12 items-center justify-center rounded-full bg-red-600 active:bg-red-700"
              onPress={() => setStep('confirm')}
              style={{ borderCurve: 'continuous' }}
            >
              <Text className="text-[15px] font-extrabold text-white">
                Delete local data
              </Text>
            </Pressable>
          )}
        </>
      )}
    </AccountPlaceholderScreen>
  );
}
