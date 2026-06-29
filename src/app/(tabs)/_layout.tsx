import { useCallback, useEffect } from 'react';
import { Stack, usePathname, useRouter } from 'expo-router';
import { BackHandler, View } from 'react-native';
import BottomNavBar from '@/components/BottomNavBar';
import { FavoriteParkingProvider } from '@/context/FavoriteParkingContext';
import { VehicleProvider } from '@/context/VehicleContext';
import {
  MapOverlayProvider,
  useMapOverlay,
  type MapOverlayMode,
} from '@/context/MapOverlayContext';
import { C } from '@/constants/theme';

function TabNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const {
    activeOverlay,
    closeOverlay,
    closeSearch,
    isSearchActive,
    openSearch,
    toggleOverlay,
  } = useMapOverlay();
  const isMapRoute = pathname.endsWith('/map');

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (activeOverlay === 'none') {
          return false;
        }

        closeOverlay();
        return true;
      },
    );

    return () => subscription.remove();
  }, [activeOverlay, closeOverlay]);

  const showOverlay = useCallback(
    (mode: Exclude<MapOverlayMode, 'none' | 'search'>) => {
      toggleOverlay(mode);
      if (!isMapRoute) {
        router.replace('/map');
      }
    },
    [isMapRoute, router, toggleOverlay],
  );

  const activeKey =
    pathname.endsWith('/garage')
      ? 'car'
      : activeOverlay === 'you'
      ? 'profile'
      : activeOverlay === 'favorites'
        ? 'favorite'
        : activeOverlay === 'search'
          ? 'search'
          : activeOverlay === 'parking'
            ? 'car'
            : 'parking';

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="map"       />
        <Stack.Screen name="garage"    />
        <Stack.Screen name="list"      />
        <Stack.Screen name="favorites" />
        <Stack.Screen name="account"   />
      </Stack>
      <BottomNavBar
        activeKey={activeKey}
        isSearchActive={isSearchActive}
        onProfilePress={() => showOverlay('you')}
        onSearchCancel={closeSearch}
        onSearchPress={() => {
          openSearch();
          if (!isMapRoute) {
            router.replace('/map');
          }
        }}
        onCarPress={() => {
          closeOverlay();
          router.push('/garage');
        }}
        onFavoritePress={() => showOverlay('favorites')}
        onParkingPress={() => {
          closeOverlay();
          router.replace({
            pathname: '/map',
            params: { locate: Date.now().toString() },
          });
        }}
      />
    </View>
  );
}

export default function TabLayout() {
  return (
    <FavoriteParkingProvider>
      <VehicleProvider>
        <MapOverlayProvider>
          <TabNavigation />
        </MapOverlayProvider>
      </VehicleProvider>
    </FavoriteParkingProvider>
  );
}
