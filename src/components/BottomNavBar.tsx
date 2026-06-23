import { useMemo, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Car, Heart, Search, UserRound } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type NavItemKey = 'search' | 'profile' | 'car' | 'favorite' | 'parking';

type NavItem = {
  key: NavItemKey;
  icon: React.ReactNode;
  onPress: () => void;
};

type BottomNavBarProps = {
  activeKey?: NavItemKey;
  onSearchPress?: () => void;
  onProfilePress?: () => void;
  onCarPress?: () => void;
  onFavoritePress?: () => void;
  onParkingPress?: () => void;
};

const ICON_COLOR = '#1E1E1E';
const MAIN_BG = '#FCF9F4';
const ACTION_BG = '#0088FF';
const ACTIVE_BG = 'rgba(217, 190, 152, 0.28)';

const BASE_MAIN_WIDTH = 262;
const BASE_ACTION_WIDTH = 70;
const BASE_GAP = 41;
const BASE_HEIGHT = 55;
const BASE_TOTAL_WIDTH = BASE_MAIN_WIDTH + BASE_GAP + BASE_ACTION_WIDTH;

const shadowStyle = {
  shadowColor: '#000',
  shadowOffset: { width: 10, height: 0 },
  shadowOpacity: 0.25,
  shadowRadius: 15,
  elevation: 8,
} satisfies ViewStyle;

function PressableNavItem({
  item,
  active,
  style,
}: {
  item: NavItem;
  active?: boolean;
  style: StyleProp<ViewStyle>;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (value: number) => {
    Animated.spring(scale, {
      toValue: value,
      speed: 24,
      bounciness: 5,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      accessibilityRole="button"
      onPress={item.onPress}
      onPressIn={() => animateTo(0.92)}
      onPressOut={() => animateTo(1)}
      android_ripple={undefined}
      style={style}
    >
      <Animated.View
        style={[
          styles.iconState,
          active && styles.iconStateActive,
          { transform: [{ scale }] },
        ]}
      >
        {item.icon}
      </Animated.View>
    </Pressable>
  );
}

export default function BottomNavBar({
  activeKey,
  onSearchPress,
  onProfilePress,
  onCarPress,
  onFavoritePress,
  onParkingPress,
}: BottomNavBarProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scale = Math.min(1, (width * 0.92) / BASE_TOTAL_WIDTH);
  const noop = () => {};

  const navItems = useMemo<NavItem[]>(
    () => [
      {
        key: 'search',
        icon: <Search size={34 * scale} color={ICON_COLOR} strokeWidth={2.15} />,
        onPress: onSearchPress ?? noop,
      },
      {
        key: 'profile',
        icon: <UserRound size={32 * scale} color={ICON_COLOR} strokeWidth={2.1} />,
        onPress: onProfilePress ?? noop,
      },
      {
        key: 'car',
        icon: <Car size={34 * scale} color={ICON_COLOR} strokeWidth={2.05} />,
        onPress: onCarPress ?? noop,
      },
      {
        key: 'favorite',
        icon: <Heart size={35 * scale} color={ICON_COLOR} strokeWidth={2} />,
        onPress: onFavoritePress ?? noop,
      },
    ],
    [onCarPress, onFavoritePress, onProfilePress, onSearchPress, scale],
  );

  const metrics = {
    mainWidth: BASE_MAIN_WIDTH * scale,
    actionWidth: BASE_ACTION_WIDTH * scale,
    gap: BASE_GAP * scale,
    height: BASE_HEIGHT * scale,
    mainRadius: 27.5 * scale,
    actionRadius: 15 * scale,
  };

  const parkingItem: NavItem = {
    key: 'parking',
    icon: (
      <Text style={[styles.parkingMark, { fontSize: 40 * scale, lineHeight: 43 * scale }]}>
        P
      </Text>
    ),
    onPress: onParkingPress ?? noop,
  };

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrapper, { bottom: insets.bottom + 12 }]}
    >
      <View style={styles.row}>
        <View
          style={[
            styles.mainPill,
            shadowStyle,
            {
              width: metrics.mainWidth,
              height: metrics.height,
              borderRadius: metrics.mainRadius,
            },
          ]}
        >
          {navItems.map((item) => (
            <PressableNavItem
              key={item.key}
              item={item}
              active={activeKey === item.key}
              style={[styles.mainItem, { height: metrics.height }]}
            />
          ))}
        </View>

        <View style={{ width: metrics.gap }} />

        <View
          style={[
            styles.actionPill,
            shadowStyle,
            {
              width: metrics.actionWidth,
              height: metrics.height,
              borderRadius: metrics.actionRadius,
            },
          ]}
        >
          <PressableNavItem
            item={parkingItem}
            active={activeKey === parkingItem.key}
            style={styles.actionItem}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainPill: {
    backgroundColor: MAIN_BG,
    borderWidth: 1,
    borderColor: '#000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    overflow: 'hidden',
  },
  actionPill: {
    backgroundColor: ACTION_BG,
    borderWidth: 1,
    borderColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  mainItem: {
    flex: 1,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionItem: {
    width: '100%',
    height: '100%',
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconState: {
    minWidth: 42,
    minHeight: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconStateActive: {
    backgroundColor: ACTIVE_BG,
  },
  parkingMark: {
    color: ICON_COLOR,
    fontWeight: '900',
    textAlign: 'center',
    includeFontPadding: false,
  },
});
