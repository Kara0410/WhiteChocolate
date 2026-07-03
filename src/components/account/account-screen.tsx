import { useCallback } from 'react';
import { ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AccountScreenSkeleton } from '@/components/account/account-screen-skeleton';
import { AppDataSection } from '@/components/account/app-data-section';
import { DangerSection } from '@/components/account/danger-section';
import { LegalSection } from '@/components/account/legal-section';
import { PreferencesSection } from '@/components/account/preferences-section';
import { ProfileHeader } from '@/components/account/profile-header';
import { QuickActionsSection } from '@/components/account/quick-actions-section';
import { SupportSection } from '@/components/account/support-section';
import { SettingsErrorPanel } from '@/components/settings/settings-error-panel';
import { useAccount } from '@/hooks/use-account';

export function AccountScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const account = useAccount();

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/map');
  }, [router]);

  return (
    <View className="flex-1 bg-slate-100">
      <ScrollView
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom, 10) + 112,
          paddingHorizontal: 20,
          paddingTop: Math.max(insets.top, 12) + 12,
        }}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          accessibilityHint="Returns to the previous page"
          accessibilityLabel="Back"
          accessibilityRole="button"
          className="mb-5 min-h-11 flex-row items-center self-start rounded-full bg-white px-3 active:bg-slate-200"
          hitSlop={8}
          onPress={goBack}
          style={{
            borderCurve: 'continuous',
            boxShadow: '0 3px 10px rgba(15,23,42,0.07)',
          }}
        >
          <ChevronLeft color="#334155" size={20} strokeWidth={2.6} />
          <Text className="mr-1 text-[14px] font-extrabold text-slate-700">
            Back
          </Text>
        </Pressable>

        <View className="mb-6">
          <Text className="text-[30px] font-black tracking-[-0.8px] text-slate-950">
            You
          </Text>
          <Text className="mt-1 text-[14px] font-semibold text-slate-500">
            Profile, preferences, and account controls
          </Text>
        </View>

        {account.error ? (
          <SettingsErrorPanel
            message={account.error.message}
            onRetry={account.refresh}
          />
        ) : null}

        {account.loading ? (
          <AccountScreenSkeleton />
        ) : (
          <>
            <ProfileHeader
              avatar={account.avatar}
              displayName={account.displayName}
              email={account.email}
              isAnonymous={account.isAnonymous}
              subscriptionStatus={account.subscriptionStatus}
            />
            <QuickActionsSection
              isAnonymous={account.isAnonymous}
              logout={account.logout}
              subscriptionStatus={account.subscriptionStatus}
            />
            <AppDataSection />
            <PreferencesSection />
            <SupportSection />
            <LegalSection />
            <DangerSection isSignedIn={account.isSignedIn} />
          </>
        )}
      </ScrollView>
    </View>
  );
}
