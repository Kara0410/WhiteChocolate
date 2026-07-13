import { useCallback, useEffect } from 'react';
import { Stack, usePathname, useRouter } from 'expo-router';
import { BackHandler, View } from 'react-native';
import BottomNavBar from '@/components/BottomNavBar';
import { FavoriteParkingProvider } from '@/context/FavoriteParkingContext';
import { PreferencesProvider } from '@/context/PreferencesContext';
import {
  MapOverlayProvider,
  useMapOverlay,
  type MapOverlayMode,
} from '@/context/MapOverlayContext';
import { useAuthSheet } from '@/context/AuthSheetContext';
import { useAccount } from '@/hooks/use-account';
import { C } from '@/constants/theme';

function TabNavigation() {
  const account = useAccount();
  const router = useRouter();
  const pathname = usePathname();
  const { showCreateAccountSheet } = useAuthSheet();
  const {
    activeOverlay,
    closeOverlay,
    closeSearch,
    isSearchActive,
    openSearch,
    toggleOverlay,
  } = useMapOverlay();
  const isMapRoute = pathname.endsWith('/map');
  const isAccountRoute =
    pathname.endsWith('/account') || pathname.includes('/account/');

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
    isAccountRoute
      ? 'profile'
      : activeOverlay === 'favorites'
        ? 'favorite'
        : activeOverlay === 'search'
          ? 'search'
          : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="map" />
        <Stack.Screen name="list" />
        <Stack.Screen name="favorites" />
        <Stack.Screen name="account" />
      </Stack>
      <BottomNavBar
        activeKey={activeKey}
        isSearchActive={isSearchActive}
        onProfilePress={() => {
          closeOverlay();
          if (!isAccountRoute) {
            router.push('/account');
          }
        }}
        onSearchCancel={closeSearch}
        onSearchPress={() => {
          openSearch();
          if (!isMapRoute) {
            router.replace('/map');
          }
        }}
        onFavoritePress={() => {
          if (!account.isSignedIn) {
            showCreateAccountSheet({ origin: 'favorites-tab' });
            return;
          }

          showOverlay('favorites');
        }}
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
