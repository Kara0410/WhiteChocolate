import { memo, useEffect, useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Heart, UserRound, type LucideIcon } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import {
  MAP_ELEVATIONS,
  MAP_LAYERS,
} from '@/components/parking-map/map-layers';

export type NavItemKey = 'favorite' | 'profile';

type BottomNavBarProps = {
  activeKey?: NavItemKey;
  onProfilePress?: () => void;
  onFavoritePress?: () => void;
};

type NavItem = {
  key: NavItemKey;
  label: string;
  icon: LucideIcon;
  onPress?: () => void;
};

const ACTIVE_COLOR = '#FFFFFF';
const INACTIVE_COLOR = 'rgba(255,255,255,0.64)';

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
      accessibilityLabel={item.label}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      className="h-full min-w-11 flex-1 items-center justify-center"
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
          <Icon color={color} size={19} strokeWidth={active ? 2.45 : 2.05} />
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
  onProfilePress,
  onFavoritePress,
}: BottomNavBarProps) {
  const insets = useSafeAreaInsets();
  const items = useMemo<NavItem[]>(
    () => [
      {
        key: 'favorite',
        label: 'FAVORITES',
        icon: Heart,
        onPress: onFavoritePress,
      },
      {
        key: 'profile',
        label: 'YOU',
        icon: UserRound,
        onPress: onProfilePress,
      },
    ],
    [onFavoritePress, onProfilePress],
  );

  return (
    <View
      className="absolute left-0 right-0 h-[66px] items-center"
      pointerEvents="box-none"
      style={{
        bottom: Math.max(insets.bottom, 8) + 12,
        elevation: MAP_ELEVATIONS.navBar,
        zIndex: MAP_LAYERS.navBar,
      }}
    >
      <View
        className="h-[66px] w-[232px] overflow-hidden rounded-[32px] border border-white/10 shadow-nav"
        style={{ borderCurve: 'continuous' }}
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
    </View>
  );
}
