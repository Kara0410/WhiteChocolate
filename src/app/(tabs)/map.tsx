import { useCallback, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';

import { ParkingMap } from '@/components/parking-map/parking-map';
import { useMapLocation } from '@/hooks/use-map-location';
import type { ParkingClusterResponse } from '@/types/parking-map';

export default function MapScreen() {
  const { favoriteFocusKey, favoriteSpotId, focusSearch, locate } =
    useLocalSearchParams<{
    favoriteFocusKey?: string;
    favoriteSpotId?: string;
    focusSearch?: string;
    locate?: string;
  }>();
  const {
    initialCamera,
    isLocationLoading,
    locationMessage,
    requestCurrentLocation,
    userLocation,
  } = useMapLocation();
  const [, setSelectedParkingItem] =
    useState<ParkingClusterResponse | null>(null);
  const handleSelectionChange = useCallback(
    (item: ParkingClusterResponse | null) => {
      setSelectedParkingItem(item);
    },
    [],
  );

  if (initialCamera === null) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-100">
        <View className="items-center gap-3 rounded-3xl bg-white px-6 py-5">
          <ActivityIndicator color="#2563EB" size="small" />
          <Text className="text-sm font-semibold text-slate-600">
            Finding your location…
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ParkingMap
      currentLocationFocusKey={locate}
      favoriteFocusKey={favoriteFocusKey}
      favoriteSpotId={favoriteSpotId}
      initialCamera={initialCamera}
      isLocationLoading={isLocationLoading}
      locationMessage={locationMessage}
      onSelectedParkingItemChange={handleSelectionChange}
      onRequestUserLocation={requestCurrentLocation}
      searchFocusKey={focusSearch}
      userLocation={userLocation}
    />
  );
}
