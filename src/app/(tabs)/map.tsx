import { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MapSearchBar } from '@/components/parking-map/map-search-bar';
import { ParkingMap } from '@/components/parking-map/parking-map';
import { useMapOverlay } from '@/context/MapOverlayContext';
import { useOnboarding } from '@/context/OnboardingContext';
import { useMapLocation } from '@/hooks/use-map-location';
import { getMapSearchControlTop } from '@/utils/map-search-layout';

function DevelopmentOnboardingReset({ top }: { top: number }) {
  const router = useRouter();
  const { resetOnboardingForDev } = useOnboarding();

  if (!__DEV__) {
    return null;
  }

  return (
    <Pressable
      accessibilityLabel="Reset onboarding"
      accessibilityRole="button"
      className="absolute right-4 z-50 min-h-10 items-center justify-center rounded-full bg-slate-950/85 px-4 active:bg-slate-800"
      onPress={() => {
        resetOnboardingForDev();
        router.replace('/onboarding');
      }}
      style={{ top }}
    >
      <Text className="text-[12px] font-black text-white">
        Reset onboarding
      </Text>
    </Pressable>
  );
}

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const { setLocationLoading } = useMapOverlay();
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
    locationSettingsRequired,
    openLocationSettings,
    requestCurrentLocation,
    userLocation,
  } = useMapLocation({ resolveInitialCamera: true });

  useEffect(() => {
    setLocationLoading(isLocationLoading);
  }, [isLocationLoading, setLocationLoading]);

  useEffect(
    () => () => {
      setLocationLoading(false);
    },
    [setLocationLoading],
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
    <View className="flex-1">
      <ParkingMap
        currentLocationFocusKey={locate}
        favoriteFocusKey={favoriteFocusKey}
        favoriteSpotId={favoriteSpotId}
        initialCamera={initialCamera}
        isLocationLoading={isLocationLoading}
        locationMessage={locationMessage}
        locationSettingsRequired={locationSettingsRequired}
        onOpenLocationSettings={openLocationSettings}
        onRequestUserLocation={requestCurrentLocation}
        searchFocusKey={focusSearch}
        userLocation={userLocation}
      />
      <MapSearchBar />
      <DevelopmentOnboardingReset
        top={getMapSearchControlTop(insets.top) + 52}
      />
    </View>
  );
}
