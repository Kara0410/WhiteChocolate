import { useCallback, useEffect, useRef } from 'react';
import { Stack, usePathname, useRouter } from 'expo-router';
import { BackHandler, View } from 'react-native';
import BottomNavBar, {
  type NavItemKey,
} from '@/components/BottomNavBar';
import { FavoriteParkingProvider } from '@/context/FavoriteParkingContext';
import { PreferencesProvider } from '@/context/PreferencesContext';
import {
  MapOverlayProvider,
  useMapOverlay,
  type MapOverlayMode,
} from '@/context/MapOverlayContext';
import { useAuthSheet } from '@/context/AuthSheetContext';
import { useAccount } from '@/hooks/use-account';
import {
  createLocationFocusKey,
  getActiveNavItemKey,
  isAccountPathname,
  shouldShowBottomNav,
} from '@/utils/tab-navigation';

function TabNavigation() {
  const account = useAccount();
  const router = useRouter();
  const pathname = usePathname();
  const { showCreateAccountSheet } = useAuthSheet();
  const {
    activeOverlay,
    closeOverlay,
    focusedMapSurface,
    isLocationLoading,
    requestDismissFocusedSurface,
    toggleOverlay,
  } = useMapOverlay();
  const locationFocusSequenceRef = useRef(0);
  const isMapRoute = pathname.endsWith('/map');
  const isAccountRoute = isAccountPathname(pathname);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (activeOverlay !== 'none') {
          closeOverlay();
          return true;
        }

        // `selectPlace` already sets activeOverlay to 'none' when entering
        // search-results mode, so a focused surface (search results, or a parking
        // detail opened directly from a marker) needs its own back-press branch here.
        if (focusedMapSurface !== 'none') {
          requestDismissFocusedSurface();
          return true;
        }

        return false;
      },
    );

    return () => subscription.remove();
  }, [activeOverlay, closeOverlay, focusedMapSurface, requestDismissFocusedSurface]);

  const showOverlay = useCallback(
    (mode: Exclude<MapOverlayMode, 'none' | 'search'>) => {
      toggleOverlay(mode);
      if (!isMapRoute) {
        router.replace('/map');
      }
    },
    [isMapRoute, router, toggleOverlay],
  );

  const handleLocationPress = useCallback(() => {
    if (isLocationLoading) {
      return;
    }

    closeOverlay();
    locationFocusSequenceRef.current += 1;
    router.replace({
      pathname: '/map',
      params: {
        locate: createLocationFocusKey(locationFocusSequenceRef.current),
      },
    });
  }, [closeOverlay, isLocationLoading, router]);

  const activeKey: NavItemKey = getActiveNavItemKey({
    activeOverlay,
    isAccountRoute,
  });
  const isBottomNavVisible = shouldShowBottomNav({
    activeOverlay,
    focusedMapSurface,
    isAccountRoute,
    isMapRoute,
  });

  return (
    <View className="flex-1 bg-background-default">
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="map" />
        <Stack.Screen name="list" />
        <Stack.Screen name="favorites" />
        <Stack.Screen name="account" />
      </Stack>
      <BottomNavBar
        activeKey={activeKey}
        isLocationLoading={isLocationLoading}
        onLocationPress={handleLocationPress}
        onMapPress={() => {
          closeOverlay();
          if (!isMapRoute) {
            router.replace('/map');
          }
        }}
        onProfilePress={() => {
          closeOverlay();
          if (!isAccountRoute) {
            router.push('/account');
          }
        }}
        onFavoritePress={() => {
          if (!account.isSignedIn) {
            showCreateAccountSheet({ origin: 'favorites-tab' });
            return;
          }

          showOverlay('favorites');
        }}
        visible={isBottomNavVisible}
      />
    </View>
  );
}

export default function TabLayout() {
  return (
    <FavoriteParkingProvider>
      <PreferencesProvider>
        <MapOverlayProvider>
          <TabNavigation />
        </MapOverlayProvider>
      </PreferencesProvider>
    </FavoriteParkingProvider>
  );
}
