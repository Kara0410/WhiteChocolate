import { memo } from 'react';

import { SettingItemList } from '@/components/settings/setting-item-list';
import { SettingsSection } from '@/components/settings/settings-section';
import { LEGAL_SETTINGS } from '@/constants/account-settings';

export const LegalSection = memo(function LegalSection() {
  return (
    <SettingsSection title="Legal & about">
      <SettingItemList items={LEGAL_SETTINGS} />
    </SettingsSection>
  );
});
