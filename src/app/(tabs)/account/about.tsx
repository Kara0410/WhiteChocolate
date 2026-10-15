import Constants from 'expo-constants';
import { Text } from 'react-native';

import { AccountPlaceholderScreen } from '@/components/account/account-placeholder-screen';

export default function AccountAboutScreen() {
  const appName = Constants.expoConfig?.name ?? 'Munich Parking';
  const version = Constants.expoConfig?.version ?? null;
  const configuredBuild =
    process.env.EXPO_OS === 'ios'
      ? Constants.expoConfig?.ios?.buildNumber ?? null
      : process.env.EXPO_OS === 'android'
        ? Constants.expoConfig?.android?.versionCode?.toString() ?? null
        : null;

  return (
    <AccountPlaceholderScreen
      description="Product information and a reliable configured app version are available here."
      title="About"
    >
      <Text className="text-[15px] font-extrabold text-ink-primary">
        {appName}
      </Text>
      <Text className="mt-2 text-[13px] font-semibold text-ink-secondary">
        {version ? `Version ${version}` : 'Version unavailable'}
      </Text>
      {configuredBuild ? (
        <Text className="mt-1 text-[13px] font-semibold text-ink-secondary">
          Build {configuredBuild}
        </Text>
      ) : null}
    </AccountPlaceholderScreen>
  );
}
