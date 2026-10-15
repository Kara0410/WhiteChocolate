import { memo } from 'react';
import { View } from 'react-native';

import { SettingRow } from '@/components/settings/setting-row';
import { SettingsSection } from '@/components/settings/settings-section';
import { SubscriptionCard } from '@/components/account/subscription-card';
import { UserRound } from 'lucide-react-native';
import { SubscriptionStatus } from '@/types/account';

export const AccountScreenSkeleton = memo(
  function AccountScreenSkeleton() {
    return (
      <>
        <View className="mb-6 flex-row items-center rounded-card bg-surface-muted px-5 py-5">
          <View className="h-14 w-14 rounded-2xl bg-surface-muted" />
          <View className="ml-4 flex-1">
            <View className="h-5 w-36 rounded-full bg-surface-muted" />
            <View className="mt-3 h-4 w-48 rounded-full bg-surface-muted" />
          </View>
        </View>
        <SettingsSection title="Account & membership">
          <SubscriptionCard
            loading
            status={SubscriptionStatus.UNKNOWN}
          />
          <SettingRow
            icon={UserRound}
            loading
            title="Account"
          />
        </SettingsSection>
      </>
    );
  },
);
