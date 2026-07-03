import Constants from 'expo-constants';
import { Text } from 'react-native';

import { AccountPlaceholderScreen } from '@/components/account/account-placeholder-screen';

export default function AccountAboutScreen() {
  const version = Constants.expoConfig?.version ?? 'Unavailable';

  return (
    <AccountPlaceholderScreen
      description="Product information and a reliable configured app version are available here."
      title="About"
    >
      <Text className="text-[15px] font-extrabold text-slate-900">
        White_choclate
      </Text>
      <Text className="mt-2 text-[13px] font-semibold text-slate-500">
        Version {version}
      </Text>
    </AccountPlaceholderScreen>
  );
}
