import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { useAuthSheet } from '@/context/AuthSheetContext';
import { useMapOverlay } from '@/context/MapOverlayContext';
import { useAccount } from '@/hooks/use-account';

export default function FavoritesDeepLink() {
  const account = useAccount();
  const router = useRouter();
  const { showCreateAccountSheet } = useAuthSheet();
  const { openOverlay } = useMapOverlay();

  useEffect(() => {
    if (account.loading) {
      return;
    }

    if (!account.isSignedIn) {
      showCreateAccountSheet({ origin: 'favorites-route' });
      router.replace('/map');
      return;
    }

    openOverlay('favorites');
    router.replace('/map');
  }, [
    account.isSignedIn,
    account.loading,
    openOverlay,
    router,
    showCreateAccountSheet,
  ]);

  return <View className="flex-1 bg-slate-100" />;
}
