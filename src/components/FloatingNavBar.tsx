import { usePathname, useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const NAV_ITEMS = [
  { name: 'Map',      route: '/map',      icon: 'map'      },
  { name: 'Search',   route: '/search',   icon: 'search'   },
  { name: 'Track',    route: '/track',    icon: 'time'     },
  { name: 'Profile',  route: '/profile',  icon: 'person'   },
  { name: 'Settings', route: '/settings', icon: 'settings' },
] as const;

export default function FloatingNavBar() {
  const router   = useRouter();
  const pathname = usePathname();
  const insets   = useSafeAreaInsets();

  const isActive = (route: string) =>
    pathname === route || pathname.endsWith(route);

  return (
    <View
      style={{
        position:         'absolute',
        left:             10,
        right:            10,
        bottom:           Math.max(10, insets.bottom),
        height:           72,
        flexDirection:    'row',
        alignItems:       'center',
        paddingHorizontal: 8,
        gap:              4,
        borderRadius:     28,
        backgroundColor:  'rgba(255,255,255,0.92)',
        shadowColor:      '#1f2f46',
        shadowOffset:     { width: 0, height: 12 },
        shadowOpacity:    0.20,
        shadowRadius:     40,
        elevation:        20,
      }}
    >
      {NAV_ITEMS.map((item) => {
        const active = isActive(item.route);
        return (
          <Pressable
            key={item.route}
            onPress={() => router.push(item.route as any)}
            style={{
              flex:            1,
              height:          54,
              borderRadius:    20,
              alignItems:      'center',
              justifyContent:  'center',
              gap:             3,
              backgroundColor: active ? 'rgba(0,122,255,0.10)' : 'transparent',
            }}
          >
            <Ionicons
              name={(active ? item.icon : `${item.icon}-outline`) as any}
              size={21}
              color={active ? '#007AFF' : '#667085'}
            />
            <Text style={{ fontSize: 11, fontWeight: '700', color: active ? '#007AFF' : '#667085' }}>
              {item.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
