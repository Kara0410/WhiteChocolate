import { memo, useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  Heart,
  LocateFixed,
  UserRound,
  type LucideIcon,
} from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import {
  MAP_ELEVATIONS,
  MAP_LAYERS,
} from '@/components/parking-map/map-layers';

export type NavItemKey = 'location' | 'favorite' | 'profile';

type BottomNavBarProps = {
  activeKey: NavItemKey;
  isLocationLoading?: boolean;
  onLocationPress?: () => void;
  onProfilePress?: () => void;
  onFavoritePress?: () => void;
  visible?: boolean;
};

type NavItem = {
  accessibilityHint?: string;
  accessibilityLabel: string;
  disabled?: boolean;
  key: NavItemKey;
  label: string;
  icon: LucideIcon;
  loading?: boolean;
  onPress?: () => void;
};

const ACTIVE_COLOR = '#FFFFFF';
const INACTIVE_COLOR = 'rgba(255,255,255,0.64)';
const NAVBAR_VISIBILITY_EASING = Easing.bezier(0.23, 1, 0.32, 1);

const NavigationItem = memo(function NavigationItem({
  item,
  active,
}: {
  item: NavItem;
  active: boolean;
}) {
  const pressedScale = useSharedValue(1);
  const activeProgress = useSharedValue(active ? 1 : 0);
  const Icon = item.icon;
  const color = active ? ACTIVE_COLOR : INACTIVE_COLOR;

  useEffect(() => {
    activeProgress.value = withTiming(active ? 1 : 0, { duration: 180 });
  }, [active, activeProgress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressedScale.value }],
  }));
  const activeStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      activeProgress.value,
      [0, 1],
      ['rgba(255,255,255,0)', 'rgba(255,255,255,0.1)'],
    ),
    borderColor: interpolateColor(
      activeProgress.value,
      [0, 1],
      ['rgba(255,255,255,0)', 'rgba(255,255,255,0.13)'],
    ),
  }));

  return (
    <Pressable
      accessibilityLabel={item.accessibilityLabel}
      accessibilityHint={item.accessibilityHint}
      accessibilityRole="tab"
      accessibilityState={{
        busy: item.loading === true,
        disabled: item.disabled === true,
        selected: active,
      }}
      className="h-full min-w-11 flex-1 items-center justify-center"
      disabled={item.disabled}
      hitSlop={6}
      onPress={item.onPress}
      onPressIn={() => {
        pressedScale.value = withTiming(0.94, { duration: 90 });
      }}
      onPressOut={() => {
        pressedScale.value = withSpring(1, { damping: 14, stiffness: 260 });
      }}
    >
      <Animated.View
        className="min-h-[54px] min-w-[88px] items-center justify-center gap-[3px] rounded-[24px] border border-transparent"
        style={[activeStyle, animatedStyle]}
      >
        <View className="h-[29px] w-[29px] items-center justify-center rounded-[15px]">
          {item.loading ? (
            <ActivityIndicator color={color} size="small" />
          ) : (
            <Icon color={color} size={19} strokeWidth={active ? 2.45 : 2.05} />
          )}
        </View>
        <Text
          className="text-[8.5px] font-extrabold leading-[10px] tracking-[0.35px]"
          numberOfLines={1}
          style={{ color }}
        >
          {item.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
});

export default function BottomNavBar({
  activeKey,
  isLocationLoading = false,
  onLocationPress,
  onProfilePress,
  onFavoritePress,
  visible = true,
}: BottomNavBarProps) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const { width: windowWidth } = useWindowDimensions();
  const visibilityProgress = useSharedValue(visible ? 1 : 0);
  const items = useMemo<NavItem[]>(
    () => [
      {
        accessibilityHint: 'Centers the map on your current location',
        accessibilityLabel: 'Current location',
        disabled: isLocationLoading,
        key: 'location',
        label: 'LOCATION',
        icon: LocateFixed,
        loading: isLocationLoading,
        onPress: onLocationPress,
      },
      {
        accessibilityLabel: 'Favorites',
        key: 'favorite',
        label: 'FAVORITES',
        icon: Heart,
        onPress: onFavoritePress,
      },
      {
        accessibilityLabel: 'You',
        key: 'profile',
        label: 'YOU',
        icon: UserRound,
        onPress: onProfilePress,
      },
    ],
    [
      isLocationLoading,
      onFavoritePress,
      onLocationPress,
      onProfilePress,
    ],
  );

  useEffect(() => {
    visibilityProgress.set(
      withTiming(visible ? 1 : 0, {
        duration: reduceMotion ? 120 : visible ? 220 : 180,
        easing: NAVBAR_VISIBILITY_EASING,
      }),
    );
  }, [reduceMotion, visibilityProgress, visible]);

  const visibilityStyle = useAnimatedStyle(() => {
    const progress = visibilityProgress.get();

    return {
      opacity: progress,
      transform: [
        {
          translateY: reduceMotion ? 0 : (1 - progress) * 84,
        },
      ],
    };
  }, [reduceMotion]);

  return (
    <Animated.View
      accessibilityElementsHidden={!visible}
      aria-hidden={!visible}
      className="absolute left-0 right-0 h-[66px] items-center"
      importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
      pointerEvents={visible ? 'box-none' : 'none'}
      style={[
        {
          bottom: Math.max(insets.bottom, 8) + 12,
          elevation: MAP_ELEVATIONS.navBar,
          zIndex: MAP_LAYERS.navBar,
        },
        visibilityStyle,
      ]}
    >
      <View
        className="h-[66px] overflow-hidden rounded-[32px] border border-white/10 shadow-nav"
        style={{
          borderCurve: 'continuous',
          width: Math.min(windowWidth - 32, 336),
        }}
      >
        <BlurView
          className="absolute inset-0"
          intensity={34}
          pointerEvents="none"
          tint="dark"
        />
        <View
          className="absolute inset-0 bg-slate-900/10"
          pointerEvents="none"
        />
        <View className="absolute inset-0 flex-row items-center px-1.5">
          {items.map((item) => (
            <NavigationItem
              active={activeKey === item.key}
              item={item}
              key={item.key}
            />
          ))}
        </View>
      </View>
    </Animated.View>
  );
}
