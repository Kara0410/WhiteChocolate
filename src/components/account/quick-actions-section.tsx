import { memo, useCallback, useMemo } from 'react';

import { SettingItemList } from '@/components/settings/setting-item-list';
import { SettingsSection } from '@/components/settings/settings-section';
import { SubscriptionCard } from '@/components/account/subscription-card';
import {
  ANONYMOUS_QUICK_ACTIONS,
  SIGNED_IN_QUICK_ACTIONS,
} from '@/constants/account-settings';
import {
  SubscriptionStatus,
  type AccountActionResult,
} from '@/types/account';
import type { SettingAction } from '@/types/settings';

type QuickActionsSectionProps = {
  isAnonymous: boolean;
  subscriptionStatus: SubscriptionStatus;
  logout: () => Promise<AccountActionResult>;
};

export const QuickActionsSection = memo(function QuickActionsSection({
  isAnonymous,
  subscriptionStatus,
  logout,
}: QuickActionsSectionProps) {
  const items = useMemo(
    () =>
      (isAnonymous
        ? ANONYMOUS_QUICK_ACTIONS
        : SIGNED_IN_QUICK_ACTIONS
      ).filter((item) => item.action !== 'upgrade'),
    [isAnonymous],
  );

  const handleAction = useCallback(
    (action: SettingAction) => {
      if (action === 'logout') {
        void logout();
      }
    },
    [logout],
  );

  return (
    <SettingsSection
      subtitle="Anonymous access stays available."
      title="Account & membership"
    >
      <SubscriptionCard
        disabled
        status={subscriptionStatus}
      />
      <SettingItemList items={items} onAction={handleAction} />
    </SettingsSection>
  );
});
