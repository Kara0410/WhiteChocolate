import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Car, Heart, Search, UserRound, type LucideIcon } from 'lucide-react-native';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStopwatch } from '@/hooks/use-stopwatch';
import Animated, {
  interpolateColor,
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

export type NavItemKey = 'search' | 'profile' | 'car' | 'favorite' | 'parking';

type BottomNavBarProps = {
  activeKey?: NavItemKey;
  onSearchPress?: () => void;
  onProfilePress?: () => void;
  onCarPress?: () => void;
  onFavoritePress?: () => void;
  onParkingPress?: () => void;
};

type NavItem = {
  key: Exclude<NavItemKey, 'parking'>;
  label: string;
  icon: LucideIcon;
  onPress?: () => void;
};

const BLUE = '#3B82F6';
const ACTIVE_BLUE = '#78B4FF';
const INACTIVE = 'rgba(255,255,255,0.46)';

function ActionGradient() {
  return (
    <Svg height="100%" pointerEvents="none" style={StyleSheet.absoluteFill} width="100%">
      <Defs>
        <SvgLinearGradient id="parking-action-gradient" x1="0" x2="1" y1="0" y2="1">
          <Stop offset="0" stopColor="#55BCFF" />
          <Stop offset="0.52" stopColor="#246BEE" />
          <Stop offset="1" stopColor="#1648C7" />
        </SvgLinearGradient>
      </Defs>
      <Rect fill="url(#parking-action-gradient)" height="100%" width="100%" />
    </Svg>
  );
}

function AmbientGradient({ warm }: { warm: boolean }) {
  const gradientId = warm ? 'parking-ambient-warm' : 'parking-ambient-cool';

  return (
    <Svg height="100%" pointerEvents="none" style={StyleSheet.absoluteFill} width="100%">
      <Defs>
        <SvgLinearGradient id={gradientId} x1="0" x2="1" y1="0.5" y2="0.5">
          <Stop
            offset="0"
            stopColor={warm ? '#E9A44F' : '#2877FF'}
            stopOpacity={warm ? 0.16 : 0}
          />
          <Stop
            offset="1"
            stopColor={warm ? '#E9A44F' : '#2877FF'}
            stopOpacity={warm ? 0 : 0.2}
          />
        </SvgLinearGradient>
      </Defs>
      <Rect fill={`url(#${gradientId})`} height="100%" width="100%" />
    </Svg>
  );
}

function NavigationItem({
  item,
  active,
}: {
  item: NavItem;
  active: boolean;
}) {
  const pressedScale = useSharedValue(1);
  const Icon = item.icon;
  const color = active ? ACTIVE_BLUE : INACTIVE;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressedScale.value }],
  }));

  return (
    <Pressable
      accessibilityLabel={item.label}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      hitSlop={6}
      onPress={item.onPress}
      onPressIn={() => {
        pressedScale.value = withTiming(0.94, { duration: 90 });
      }}
      onPressOut={() => {
        pressedScale.value = withSpring(1, { damping: 14, stiffness: 260 });
      }}
      style={styles.navigationItem}
    >
      <Animated.View style={[styles.navigationItemContent, animatedStyle]}>
        <Icon color={color} size={22} strokeWidth={2.05} />
        <Text numberOfLines={1} style={[styles.navigationLabel, { color }]}>
          {item.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

function Twinkle({
  active,
  delay,
  style,
}: {
  active: boolean;
  delay: number;
  style: { left?: number; right?: number; top: number; width: number; height: number };
}) {
  const opacity = useSharedValue(0.28);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.3, { duration: active ? 220 : 420 }),
          withTiming(0.1, { duration: active ? 360 : 720 }),
        ),
        -1,
        true,
      ),
    );
  }, [active, delay, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View pointerEvents="none" style={[styles.twinkle, style, animatedStyle]} />;
}

function ParkingAction({
  formattedTime,
  isActive,
  onPress,
}: {
  formattedTime: string;
  isActive: boolean;
  onPress: () => void;
}) {
  const pressedScale = useSharedValue(1);
  const pulse = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.28);
  const activeProgress = useSharedValue(isActive ? 1 : 0);
  const actionWidth = useSharedValue(isActive ? 136 : 72);

  useEffect(() => {
    activeProgress.value = withTiming(isActive ? 1 : 0, { duration: 240 });
    actionWidth.value = withSpring(isActive ? 136 : 72, {
      damping: 16,
      stiffness: 180,
    });
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: isActive ? 700 : 2200 }),
        withTiming(isActive ? 1.08 : 1.18, { duration: isActive ? 320 : 520 }),
        withTiming(1, { duration: isActive ? 220 : 280 }),
      ),
      -1,
      false,
    );
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(isActive ? 0.18 : 0.12, { duration: isActive ? 700 : 2200 }),
        withTiming(0, { duration: isActive ? 540 : 800 }),
      ),
      -1,
      false,
    );
  }, [actionWidth, activeProgress, isActive, pulse, pulseOpacity]);

  const buttonStyle = useAnimatedStyle(() => ({
    width: actionWidth.value,
    backgroundColor: interpolateColor(
      activeProgress.value,
      [0, 1],
      ['#246BEE', '#E1D8C6'],
    ),
    transform: [{ scale: pressedScale.value }],
  }));
  const pulseStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      activeProgress.value,
      [0, 1],
      ['#3B82F6', '#E1D8C6'],
    ),
    opacity: pulseOpacity.value,
    transform: [{ scale: pulse.value }],
  }));
  const gradientStyle = useAnimatedStyle(() => ({
    opacity: 1 - activeProgress.value,
  }));
  const parkingMarkStyle = useAnimatedStyle(() => ({
    opacity: 1 - activeProgress.value,
    transform: [{ scale: 1 - activeProgress.value * 0.15 }],
  }));
  const stopwatchStyle = useAnimatedStyle(() => ({
    opacity: activeProgress.value,
    transform: [{ scale: 0.9 + activeProgress.value * 0.1 }],
  }));

  return (
    <Animated.View style={[styles.actionContainer, buttonStyle]}>
      <Animated.View pointerEvents="none" style={[styles.actionPulse, pulseStyle]} />
      <Pressable
        accessibilityLabel={isActive ? `Stop parking timer at ${formattedTime}` : 'Start parking timer'}
        accessibilityRole="button"
        accessibilityState={{ selected: isActive }}
        hitSlop={4}
        onPress={onPress}
        onPressIn={() => {
          pressedScale.value = withTiming(0.95, { duration: 90 });
        }}
        onPressOut={() => {
          pressedScale.value = withSpring(1, { damping: 14, stiffness: 260 });
        }}
        style={styles.actionPressable}
      >
        <View style={styles.actionButton}>
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, gradientStyle]}>
            <ActionGradient />
          </Animated.View>
          <Twinkle active={isActive} delay={120} style={{ left: 16, top: 13, width: 3, height: 3 }} />
          <Twinkle active={isActive} delay={760} style={{ right: 14, top: 20, width: 4, height: 4 }} />
          <Twinkle active={isActive} delay={1380} style={{ right: 21, top: 10, width: 2, height: 2 }} />
          <Animated.View pointerEvents="none" style={[styles.actionContent, parkingMarkStyle]}>
            <Text style={styles.parkingMark}>P</Text>
          </Animated.View>
          <Animated.View pointerEvents="none" style={[styles.actionContent, stopwatchStyle]}>
            <Text style={styles.stopwatchLabel}>PARKING</Text>
            <Text style={styles.stopwatchTime}>{formattedTime}</Text>
          </Animated.View>
        </View>
      </Pressable>
    </Animated.View>
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
  const [isParkingActive, setIsParkingActive] = useState(false);
  const stopwatch = useStopwatch();
  const items: NavItem[] = [
    { key: 'search', label: 'SEARCH', icon: Search, onPress: onSearchPress },
    { key: 'car', label: 'PARKING', icon: Car, onPress: onCarPress },
    { key: 'favorite', label: 'FAVORITES', icon: Heart, onPress: onFavoritePress },
    { key: 'profile', label: 'YOU', icon: UserRound, onPress: onProfilePress },
  ];
  const toggleParkingMode = () => {
    if (isParkingActive) {
      stopwatch.stop();
      setIsParkingActive(false);
      return;
    }

    stopwatch.start(true);
    setIsParkingActive(true);
    onParkingPress?.();
  };

  return (
    <Animated.View
      entering={SlideInDown.damping(15).stiffness(120)}
      pointerEvents="box-none"
      style={[styles.wrapper, { bottom: Math.max(insets.bottom, 10) + 10 }]}
    >
      <BlurView intensity={80} style={styles.glass} tint="dark">
        <View pointerEvents="none" style={[styles.ambientGlow, styles.amberGlow]}>
          <AmbientGradient warm />
        </View>
        <View pointerEvents="none" style={[styles.ambientGlow, styles.blueGlow]}>
          <AmbientGradient warm={false} />
        </View>

        <View style={styles.navigationGroup}>
          {items.map((item) => (
            <NavigationItem active={activeKey === item.key} item={item} key={item.key} />
          ))}
        </View>

        <ParkingAction
          formattedTime={stopwatch.formattedTime}
          isActive={isParkingActive}
          onPress={toggleParkingMode}
        />
      </BlurView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 20,
    alignItems: 'center',
  },
  glass: {
    width: '100%',
    maxWidth: 358,
    height: 80,
    borderRadius: 32,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(16,16,18,0.62)',
    boxShadow: '0 14px 34px rgba(0,0,0,0.28)',
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    paddingLeft: 8,
    paddingRight: 12,
  },
  ambientGlow: {
    position: 'absolute',
    bottom: -42,
    width: 150,
    height: 110,
    borderRadius: 75,
  },
  amberGlow: {
    left: -46,
  },
  blueGlow: {
    right: -30,
  },
  navigationGroup: {
    flex: 1,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 7,
  },
  navigationItem: {
    flex: 1,
    minWidth: 44,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navigationItemContent: {
    minWidth: 46,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  navigationLabel: {
    fontSize: 9,
    lineHeight: 10,
    fontWeight: '700',
    letterSpacing: 0.35,
  },
  actionContainer: {
    width: 72,
    height: 64,
    borderRadius: 24,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPulse: {
    position: 'absolute',
    left: 4,
    right: 4,
    height: 56,
    borderRadius: 24,
    borderCurve: 'continuous',
    backgroundColor: BLUE,
  },
  actionButton: {
    width: '100%',
    height: 64,
    borderRadius: 24,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.34), 0 8px 24px rgba(32,42,55,0.32)',
    overflow: 'hidden',
  },
  actionPressable: {
    width: '100%',
    height: '100%',
  },
  actionContent: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  parkingMark: {
    color: '#FFFFFF',
    fontSize: 29,
    lineHeight: 33,
    fontWeight: '900',
    letterSpacing: -1,
    includeFontPadding: false,
  },
  stopwatchLabel: {
    color: 'rgba(44,38,29,0.62)',
    fontSize: 8,
    lineHeight: 10,
    fontWeight: '800',
    letterSpacing: 1.05,
  },
  stopwatchTime: {
    color: '#2C261D',
    fontFamily: process.env.EXPO_OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  twinkle: {
    position: 'absolute',
    zIndex: 2,
    borderRadius: 99,
    backgroundColor: '#FFFFFF',
  },
});
