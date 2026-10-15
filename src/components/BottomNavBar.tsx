import { memo, useEffect, useMemo, type ComponentType } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import {
  FigmaFavoriteIcon,
  FigmaGpsIcon,
  FigmaMapIcon,
  FigmaProfileIcon,
} from '@/components/ui/figma-icons';
import { GlassSurface } from '@/components/ui/glass-surface';
import {
  MAP_ELEVATIONS,
  MAP_LAYERS,
} from '@/components/parking-map/map-layers';
import { COLORS, HOME_LAYOUT } from '@/constants/theme';

export type NavItemKey = 'map' | 'favorite' | 'profile';

type BottomNavBarProps = {
  activeKey: NavItemKey;
  isLocationLoading?: boolean;
  onFavoritePress?: () => void;
  onLocationPress?: () => void;
  onMapPress?: () => void;
  onProfilePress?: () => void;
  visible?: boolean;
};

type NavigationIcon = ComponentType<{ color?: string; size?: number }>;

type NavItem = {
  accessibilityLabel: string;
  icon: NavigationIcon;
  key: NavItemKey;
  label: string;
  onPress?: () => void;
};

const NAVBAR_VISIBILITY_EASING = Easing.bezier(0.23, 1, 0.32, 1);

const NavigationItem = memo(function NavigationItem({
  active,
  item,
}: {
  active: boolean;
  item: NavItem;
}) {
  const pressedScale = useSharedValue(1);
  const color = active ? COLORS.icon.active : COLORS.icon.default;
  const Icon = item.icon;
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressedScale.value }],
  }));

  return (
    <Pressable
      accessibilityLabel={item.accessibilityLabel}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      className="h-full min-w-11 flex-1 items-center justify-center"
      hitSlop={4}
      onPress={item.onPress}
      onPressIn={() => {
        pressedScale.value = withTiming(0.94, { duration: 90 });
      }}
      onPressOut={() => {
        pressedScale.value = withSpring(1, { damping: 15, stiffness: 260 });
      }}
    >
      <Animated.View
        className="min-h-[54px] min-w-[88px] items-center justify-center gap-[4px]"
        style={animatedStyle}
      >
        <Icon color={color} size={active ? 23 : 22} />
        <Text
          className="text-navigation tracking-[0.15px]"
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
  onFavoritePress,
  onLocationPress,
  onMapPress,
  onProfilePress,
  visible = true,
}: BottomNavBarProps) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const { width: windowWidth } = useWindowDimensions();
  const visibilityProgress = useSharedValue(visible ? 1 : 0);
  const horizontalInset = windowWidth < 360 ? 16 : HOME_LAYOUT.horizontalInset;
  const navigationBottom = Math.max(
    HOME_LAYOUT.navigationBottom,
    insets.bottom,
  );
  const gpsBottom =
    navigationBottom +
    HOME_LAYOUT.navigationHeight +
    HOME_LAYOUT.gpsNavigationGap;
  const items = useMemo<NavItem[]>(
    () => [
      {
        accessibilityLabel: 'Map',
        icon: FigmaMapIcon,
        key: 'map',
        label: 'MAP',
        onPress: onMapPress,
      },
      {
        accessibilityLabel: 'Favorite',
        icon: FigmaFavoriteIcon,
        key: 'favorite',
        label: 'FAVORITE',
        onPress: onFavoritePress,
      },
      {
        accessibilityLabel: 'Profile',
        icon: FigmaProfileIcon,
        key: 'profile',
        label: 'PROFILE',
        onPress: onProfilePress,
      },
    ],
    [onFavoritePress, onMapPress, onProfilePress],
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
      importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
      pointerEvents={visible ? 'box-none' : 'none'}
      style={[
        {
          elevation: MAP_ELEVATIONS.navBar,
          inset: 0,
          position: 'absolute',
          zIndex: MAP_LAYERS.navBar,
        },
        visibilityStyle,
      ]}
    >
      <View
        className="absolute items-center"
        pointerEvents="box-none"
        style={{
          bottom: navigationBottom,
          height: HOME_LAYOUT.navigationHeight,
          left: horizontalInset,
          right: horizontalInset,
        }}
      >
        <GlassSurface
          style={{ height: HOME_LAYOUT.navigationHeight, width: '100%' }}
          variant="navigation"
        >
          <View className="h-full flex-row items-center">
            {items.map((item) => (
              <NavigationItem
                active={activeKey === item.key}
                item={item}
                key={item.key}
              />
            ))}
          </View>
        </GlassSurface>
      </View>

      <View
        className="absolute items-center justify-center"
        pointerEvents="box-none"
        style={{
          bottom: gpsBottom,
          height: HOME_LAYOUT.gpsSize,
          right: horizontalInset,
          width: HOME_LAYOUT.gpsSize,
        }}
      >
        <GlassSurface
          style={{
            height: HOME_LAYOUT.gpsSize,
            width: HOME_LAYOUT.gpsSize,
          }}
          variant="floatingAction"
        >
          <Pressable
            accessibilityHint="Centers the map on your current location"
            accessibilityLabel="Current location"
            accessibilityRole="button"
            accessibilityState={{
              busy: isLocationLoading,
              disabled: isLocationLoading,
            }}
            className="h-full w-full items-center justify-center"
            disabled={isLocationLoading}
            hitSlop={6}
            onPress={onLocationPress}
            style={({ pressed }) => ({ opacity: pressed ? 0.68 : 1 })}
          >
            {isLocationLoading ? (
              <ActivityIndicator color={COLORS.accent.primary} size="small" />
            ) : (
              <FigmaGpsIcon color={COLORS.accent.primary} size={25} />
            )}
          </Pressable>
        </GlassSurface>
      </View>
    </Animated.View>
  );
}
