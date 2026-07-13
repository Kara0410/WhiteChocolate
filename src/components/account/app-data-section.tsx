import { memo, useCallback, useMemo } from 'react';

import { SettingItemList } from '@/components/settings/setting-item-list';
import { SettingsErrorPanel } from '@/components/settings/settings-error-panel';
import { SettingsSection } from '@/components/settings/settings-section';
import { getAppDataSettings } from '@/constants/account-settings';
import { useFavoriteParking } from '@/context/FavoriteParkingContext';
import { useLocationPermissionStatus } from '@/hooks/use-location-permission-status';
import type { SettingAction } from '@/types/settings';

export const AppDataSection = memo(function AppDataSection() {
  const { favoriteItems } = useFavoriteParking();
  const location = useLocationPermissionStatus();
  const { openSettings } = location;
  const items = useMemo(
    () =>
      getAppDataSettings({
        favoriteCount: favoriteItems.length,
        locationDescription: location.description,
        locationLabel: location.label,
        locationLoading: location.loading,
      }),
    [
      favoriteItems.length,
      location.description,
      location.label,
      location.loading,
    ],
  );

  const handleAction = useCallback(
    (action: SettingAction) => {
      if (action === 'open-system-settings') {
        void openSettings();
      }
    },
    [openSettings],
  );

  return (
    <>
      {location.error ? (
        <SettingsErrorPanel
          message={location.error}
          onRetry={location.refresh}
        />
      ) : null}
      <SettingsSection
        subtitle="Live data currently stored by this app session."
        title="Your app data"
      >
        <SettingItemList items={items} onAction={handleAction} />
      </SettingsSection>
    </>
  );
});
