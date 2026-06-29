import { useEffect, useRef } from 'react';
import { Stack, usePathname, useRouter } from 'expo-router';
import { View } from 'react-native';
import BottomNavBar from '@/components/BottomNavBar';
import { FavoriteParkingProvider } from '@/context/FavoriteParkingContext';
import { MapSearchProvider, useMapSearch } from '@/context/MapSearchContext';
import { C } from '@/constants/theme';

function TabNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const { closeSearch, isSearchActive, openSearch } = useMapSearch();
  const isMapRoute = pathname.endsWith('/map');
  const previousPathnameRef = useRef(pathname);

  useEffect(() => {
    if (
      previousPathnameRef.current !== pathname &&
      !isMapRoute &&
      isSearchActive
    ) {
      closeSearch();
    }
    previousPathnameRef.current = pathname;
  }, [closeSearch, isMapRoute, isSearchActive, pathname]);

  const activeKey = pathname.endsWith('/account')
    ? 'profile'
    : pathname.endsWith('/favorites')
      ? 'favorite'
    : isMapRoute && isSearchActive
      ? 'search'
    : pathname.endsWith('/list')
      ? 'car'
      : 'parking';

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="map"       />
        <Stack.Screen name="list"      />
        <Stack.Screen name="favorites" />
        <Stack.Screen name="account"   />
      </Stack>
      <BottomNavBar
        activeKey={activeKey}
        isSearchActive={isSearchActive}
        onProfilePress={() => router.push('/account')}
        onSearchCancel={closeSearch}
        onSearchPress={() => {
          openSearch();
          if (!isMapRoute) {
            router.push('/map');
          }
        }}
        onCarPress={() => router.push('/list')}
        onFavoritePress={() => router.push('/favorites')}
        onParkingPress={() => router.push({ pathname: '/map', params: { locate: Date.now().toString() } })}
      />
    </View>
  );
}

export default function TabLayout() {
  return (
    <FavoriteParkingProvider>
      <MapSearchProvider>
        <TabNavigation />
      </MapSearchProvider>
    </FavoriteParkingProvider>
  );
}
