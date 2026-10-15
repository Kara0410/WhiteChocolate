import { useCallback, useState, type ReactNode } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { AccountPlaceholderScreen } from '@/components/account/account-placeholder-screen';
import { useFavoriteParking } from '@/context/FavoriteParkingContext';
import { usePreferences } from '@/context/PreferencesContext';
import { COLORS } from '@/constants/theme';

type LocalDataStep = 'overview' | 'confirm' | 'done';

function LocalDataItem({ children }: { children: ReactNode }) {
  return (
    <View className="mt-2 flex-row">
      <Text className="text-[13px] font-semibold leading-5 text-ink-muted">
        {'•'}
      </Text>
      <Text className="ml-2 flex-1 text-[13px] font-semibold leading-5 text-ink-secondary">
        {children}
      </Text>
    </View>
  );
}

export default function LocalDataScreen() {
  const router = useRouter();
  const { clearFavorites, favoriteItems } = useFavoriteParking();
  const { resetPreferences } = usePreferences();
  const [step, setStep] = useState<LocalDataStep>('overview');
  const [isClearing, setIsClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClear = useCallback(async () => {
    if (isClearing || step !== 'confirm') {
      return;
    }

    setIsClearing(true);
    setError(null);

    try {
      const [favoritesResult, preferencesResult] = await Promise.all([
        clearFavorites(),
        resetPreferences(),
      ]);

      if (!favoritesResult.ok || !preferencesResult.ok) {
        setError(
          'Some local data could not be cleared. Please try again.',
        );
        return;
      }

      setStep('done');
    } finally {
      setIsClearing(false);
    }
  }, [clearFavorites, isClearing, resetPreferences, step]);

  const returnToAccount = useCallback(() => {
    router.replace('/account');
  }, [router]);

  return (
    <AccountPlaceholderScreen
      description={
        step === 'done'
          ? 'Your local favorites and preferences have been cleared.'
          : 'Manage favorites and preferences saved only on this device.'
      }
      title="Storage & local data"
    >
      {step === 'done' ? (
        <View accessibilityRole="alert">
          <Text className="text-[17px] font-extrabold text-ink-primary">
            Local data cleared
          </Text>
          <Text className="mt-2 text-[13px] font-semibold leading-5 text-ink-secondary">
            Your favorites and preferences were removed from this device.
          </Text>
          <Pressable
            accessibilityLabel="Back to account"
            accessibilityRole="button"
            className="mt-5 min-h-12 items-center justify-center rounded-full bg-accent-primary active:bg-accent-pressed"
            onPress={returnToAccount}
            style={{ borderCurve: 'continuous' }}
          >
            <Text className="text-[15px] font-extrabold text-ink-on-accent">
              Done
            </Text>
          </Pressable>
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

          <View className="rounded-2xl border border-border-subtle bg-surface-input p-4">
            <Text className="text-[15px] font-extrabold text-ink-primary">
              Stored on this device
            </Text>
            <LocalDataItem>
              Favorite parking areas ({favoriteItems.length.toLocaleString()})
            </LocalDataItem>
            <LocalDataItem>App preferences</LocalDataItem>
          </View>

          {step === 'confirm' ? (
            <>
              <Text className="mt-5 text-[14px] font-extrabold leading-5 text-ink-primary">
                Clear these items from this device?
              </Text>
              <Pressable
                accessibilityLabel="Clear local app data"
                accessibilityRole="button"
                className={
                  isClearing
                    ? 'mt-4 min-h-12 flex-row items-center justify-center rounded-full bg-surface-muted'
                    : 'mt-4 min-h-12 flex-row items-center justify-center rounded-full bg-accent-primary active:bg-accent-pressed'
                }
                disabled={isClearing}
                onPress={() => {
                  void handleClear();
                }}
                style={{ borderCurve: 'continuous' }}
              >
                {isClearing ? (
                  <ActivityIndicator color={COLORS.surface.default} size="small" />
                ) : null}
                <Text className="text-[15px] font-extrabold text-ink-on-accent">
                  {isClearing ? 'Clearing local data' : 'Clear local data'}
                </Text>
              </Pressable>
              <Pressable
                accessibilityLabel="Cancel clearing local data"
                accessibilityRole="button"
                className="mt-3 min-h-12 items-center justify-center rounded-full bg-background-default active:bg-surface-muted"
                disabled={isClearing}
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
              accessibilityHint="Shows a confirmation before clearing local data"
              accessibilityLabel="Clear local app data"
              accessibilityRole="button"
              className="mt-5 min-h-12 items-center justify-center rounded-full border border-border-strong bg-background-default active:bg-surface-muted"
              onPress={() => setStep('confirm')}
              style={{ borderCurve: 'continuous' }}
            >
              <Text className="text-[15px] font-extrabold text-ink-primary">
                Clear local app data
              </Text>
            </Pressable>
          )}
        </>
      )}
    </AccountPlaceholderScreen>
  );
}
