import { memo } from 'react';

import { SettingItemList } from '@/components/settings/setting-item-list';
import { SettingsSection } from '@/components/settings/settings-section';
import { SUPPORT_SETTINGS } from '@/constants/account-settings';

export const SupportSection = memo(function SupportSection() {
  return (
    <SettingsSection title="Support">
      <SettingItemList items={SUPPORT_SETTINGS} />
    </SettingsSection>
  );
});
