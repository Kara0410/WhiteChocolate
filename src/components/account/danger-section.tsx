import { memo, useMemo } from 'react';

import { SettingItemList } from '@/components/settings/setting-item-list';
import { SettingsSection } from '@/components/settings/settings-section';
import { getDangerSettings } from '@/constants/account-settings';

type DangerSectionProps = {
  isSignedIn: boolean;
};

export const DangerSection = memo(function DangerSection({
  isSignedIn,
}: DangerSectionProps) {
  const items = useMemo(
    () => getDangerSettings(isSignedIn),
    [isSignedIn],
  );

  return (
    <SettingsSection title="Data controls">
      <SettingItemList items={items} />
    </SettingsSection>
  );
});
