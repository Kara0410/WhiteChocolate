import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { FavoriteParkingBottomSheet } from '@/components/parking-map/FavoriteParkingBottomSheet';
import { C } from '@/constants/theme';
import type { ParkingClusterResponse } from '@/types/parking-map';

export default function FavoritesScreen() {
  const router = useRouter();

  const handleClose = useCallback(() => {
    router.replace('/map');
  }, [router]);

  const handleSpotPress = useCallback(
    (item: ParkingClusterResponse) => {
      router.replace({
        pathname: '/map',
        params: { favoriteSpotId: item.id },
      });
    },
    [router],
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View className="absolute inset-0 bg-slate-200" />
      <FavoriteParkingBottomSheet
        onClose={handleClose}
        onSpotPress={handleSpotPress}
      />
    </View>
  );
}
