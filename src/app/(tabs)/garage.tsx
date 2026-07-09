import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { GarageScreen } from '@/components/garage/GarageScreen';
import { useAuthSheet } from '@/context/AuthSheetContext';
import { useAccount } from '@/hooks/use-account';

export default function GarageRoute() {
  const account = useAccount();
  const router = useRouter();
  const { showCreateAccountSheet } = useAuthSheet();

  useEffect(() => {
    if (!account.loading && !account.isSignedIn) {
      showCreateAccountSheet({ origin: 'garage-route' });
      router.replace('/map');
    }
  }, [
    account.isSignedIn,
    account.loading,
    router,
    showCreateAccountSheet,
  ]);

  if (account.loading) {
    return <View className="flex-1 bg-slate-100" />;
  }

  if (!account.isSignedIn) {
    return <View className="flex-1 bg-slate-100" />;
  }

  return <GarageScreen />;
}
