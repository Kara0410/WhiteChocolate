import { Stack, useGlobalSearchParams, usePathname, useRouter } from 'expo-router';
import { View } from 'react-native';
import BottomNavBar from '@/components/BottomNavBar';
import { FavoriteParkingProvider } from '@/context/FavoriteParkingContext';
import { C } from '@/constants/theme';

export default function TabLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { focusSearch } = useGlobalSearchParams<{ focusSearch?: string }>();

  const activeKey = pathname.endsWith('/account')
    ? 'profile'
    : pathname.endsWith('/favorites')
      ? 'favorite'
    : pathname.endsWith('/list')
      ? focusSearch
        ? 'search'
        : 'car'
      : 'parking';

  return (
    <FavoriteParkingProvider>
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="map"       />
          <Stack.Screen name="list"      />
          <Stack.Screen name="favorites" />
          <Stack.Screen name="account"   />
        </Stack>
        <BottomNavBar
          activeKey={activeKey}
          onProfilePress={() => router.push('/account')}
          onSearchPress={() => router.push({ pathname: '/list', params: { focusSearch: Date.now().toString() } })}
          onCarPress={() => router.push('/list')}
          onFavoritePress={() => router.push('/favorites')}
          onParkingPress={() => router.push({ pathname: '/map', params: { locate: Date.now().toString() } })}
        />
      </View>
    </FavoriteParkingProvider>
  );
}
