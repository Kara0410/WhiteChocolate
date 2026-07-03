import { memo, useCallback } from 'react';
import { type Href, useRouter } from 'expo-router';

import { SettingRow } from '@/components/settings/setting-row';
import { SettingsErrorPanel } from '@/components/settings/settings-error-panel';
import { SettingsSection } from '@/components/settings/settings-section';
import { PREFERENCE_SETTINGS } from '@/constants/account-settings';
import { usePreferences } from '@/context/PreferencesContext';
import type {
  BooleanPreferenceKey,
  Preferences,
} from '@/types/preferences';
import type { SettingItem } from '@/types/settings';

const PreferenceRow = memo(function PreferenceRow({
  item,
  loading,
  preferences,
  setPreference,
  showDivider,
}: {
  item: SettingItem;
  loading: boolean;
  preferences: Preferences;
  setPreference: <Key extends keyof Preferences>(
    key: Key,
    value: Preferences[Key],
  ) => void;
  showDivider: boolean;
}) {
  const router = useRouter();
  const switchKey = item.switchKey;
  const switchValue =
    switchKey === undefined ? undefined : preferences[switchKey];

  const handlePress = useCallback(() => {
    if (item.navigationTarget) {
      router.push(item.navigationTarget as Href);
    }
  }, [item.navigationTarget, router]);

  const handleSwitchChange = useCallback(
    (value: boolean) => {
      if (switchKey) {
        setPreference(
          switchKey as BooleanPreferenceKey,
          value,
        );
      }
    },
    [setPreference, switchKey],
  );

  const unitsText =
    item.id === 'units'
      ? preferences.units === 'metric'
        ? 'Metric'
        : 'Imperial'
      : item.rightText;

  return (
    <SettingRow
      badge={item.badge}
      disabled={item.disabled}
      icon={item.icon}
      loading={loading}
      onPress={item.navigationTarget ? handlePress : undefined}
      onSwitchValueChange={
        switchKey ? handleSwitchChange : undefined
      }
      rightText={unitsText}
      showChevron={item.type === 'navigation'}
      showDivider={showDivider}
      subtitle={item.subtitle}
      switchValue={switchValue}
      title={item.title}
    />
  );
});

export const PreferencesSection = memo(function PreferencesSection() {
  const {
    preferences,
    loading,
    error,
    refresh,
    setPreference,
  } = usePreferences();

  return (
    <>
      {error ? (
        <SettingsErrorPanel
          message={error.message}
          onRetry={refresh}
        />
      ) : null}
      <SettingsSection
        subtitle="Stored only on this device during Week 1."
        title="Preferences"
      >
        {PREFERENCE_SETTINGS.map((item, index) => (
          <PreferenceRow
            item={item}
            key={item.id}
            loading={loading}
            preferences={preferences}
            setPreference={setPreference}
            showDivider={index < PREFERENCE_SETTINGS.length - 1}
          />
        ))}
      </SettingsSection>
    </>
  );
});
