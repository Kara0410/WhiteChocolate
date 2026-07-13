import React, { memo, useCallback, useEffect } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import {
  getAvailabilityStatus,
  getAvailabilityTheme,
  type AvailabilityStatus,
  type AvailabilityTheme,
} from './parking-availability-status';
import { formatParkingAreaCount } from './marker-visuals';

export type BubbleType = 'cluster' | 'spot';
export type BubbleSize = 'small' | 'medium' | 'large';
export type BubbleState = 'default' | 'pressed' | 'selected';

export type ParkingAvailabilityBubbleProps = {
  type: BubbleType;
  percentage: number | null;
  count?: number;
  zoneCount?: number;
  size?: BubbleSize;
  state?: BubbleState;
  performanceMode?: 'normal' | 'moving';
  className?: string;
  onPress?: () => void;
};

const CLUSTER_SIZE = {
  large: {
    canvasWidth: 132,
    canvasHeight: 52,
    minWidth: 86,
    height: 44,
    font: 15,
    horizontalPadding: 18,
  },
  medium: {
    canvasWidth: 124,
    canvasHeight: 50,
    minWidth: 80,
    height: 42,
    font: 14,
    horizontalPadding: 17,
  },
  small: {
    canvasWidth: 116,
    canvasHeight: 48,
    minWidth: 74,
    height: 40,
    font: 13,
    horizontalPadding: 16,
  },
} as const;

const SPOT_SIZE = {
  large: { canvasWidth: 78, canvasHeight: 50, width: 68, height: 36, font: 18 },
  medium: { canvasWidth: 72, canvasHeight: 50, width: 64, height: 34, font: 17 },
  small: { canvasWidth: 66, canvasHeight: 46, width: 58, height: 32, font: 16 },
} as const;

const SPRING_CONFIG = {
  damping: 18,
  stiffness: 260,
  mass: 0.65,
  reduceMotion: ReduceMotion.System,
} as const;
const SELECTION_TIMING_CONFIG = {
  duration: 160,
  reduceMotion: ReduceMotion.System,
} as const;
const UNKNOWN_AVAILABILITY_THEME: AvailabilityTheme = {
  fill: '#64748B',
  text: '#FFFFFF',
  ring: '#94A3B8',
  ringTrack: 'rgba(148, 163, 184, 0.24)',
  glow: 'rgba(100, 116, 139, 0.26)',
  glowStrong: 'rgba(100, 116, 139, 0.34)',
  backgroundTint: '#64748B',
  border: '#FFFFFF',
  movingFill: '#64748B',
};

export { getAvailabilityStatus };
export type { AvailabilityStatus };

function normalizeClusterCount(count: number) {
  return Number.isFinite(count) ? Math.max(0, Math.round(count)) : 0;
}

function clampPercentage(percentage: number) {
  return Number.isFinite(percentage)
    ? Math.min(100, Math.max(0, Math.round(percentage)))
    : 0;
}

function markerShadow(
  selected: boolean,
  moving: boolean,
  isCluster: boolean,
  glowStrong: string,
): ViewStyle['boxShadow'] {
  if (moving) {
    return isCluster
      ? '0 3px 8px rgba(15, 23, 42, 0.16)'
      : '0 1px 3px rgba(15, 23, 42, 0.18)';
  }
  if (isCluster && selected) {
    return '0 9px 20px rgba(37, 99, 235, 0.26)';
  }
  if (isCluster) {
    return '0 8px 18px rgba(15, 23, 42, 0.22)';
  }
  if (selected) {
    return `0 7px 18px 2px ${glowStrong}`;
  }
  return '0 3px 9px rgba(15, 23, 42, 0.24)';
}

function ParkingAvailabilityBubble({
  type,
  percentage,
  count,
  zoneCount = 0,
  size = 'medium',
  state = 'default',
  performanceMode = 'normal',
  className,
  onPress,
}: ParkingAvailabilityBubbleProps) {
  const availabilityKnown = percentage !== null && Number.isFinite(percentage);
  const clampedPercentage = availabilityKnown
    ? clampPercentage(percentage)
    : 0;
  const theme = availabilityKnown
    ? getAvailabilityTheme(clampedPercentage)
    : UNKNOWN_AVAILABILITY_THEME;
  const selected = state === 'selected';
  const forcedPressed = state === 'pressed';
  const moving = performanceMode === 'moving';
  const isCluster = type === 'cluster';
  const clusterDimensions = isCluster ? CLUSTER_SIZE[size] : null;
  const spotDimensions = isCluster ? null : SPOT_SIZE[size];
  const dimensions = clusterDimensions ?? spotDimensions ?? SPOT_SIZE.medium;
  const restingScale = selected
    ? isCluster
      ? 1.05
      : 1.12
    : forcedPressed
      ? 0.95
      : 1;
  const scale = useSharedValue(restingScale);
  const selectionProgress = useSharedValue(selected && !moving ? 1 : 0);
  const clusterCount = normalizeClusterCount(count ?? zoneCount);
  const label = isCluster
    ? `${formatParkingAreaCount(clusterCount)} parking areas`
    : availabilityKnown
      ? `${clampedPercentage}% estimated parking availability`
      : 'Parking availability unavailable';

  const animateScale = useCallback(
    (toValue: number) => {
      scale.value = withSpring(toValue, SPRING_CONFIG);
    },
    [scale],
  );

  useEffect(() => {
    animateScale(restingScale);
  }, [animateScale, restingScale]);

  useEffect(() => {
    selectionProgress.value = withTiming(
      selected && !moving ? 1 : 0,
      SELECTION_TIMING_CONFIG,
    );
  }, [moving, selected, selectionProgress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const auraAnimatedStyle = useAnimatedStyle(() => ({
    opacity: selectionProgress.value,
    transform: [{ scale: 0.82 + selectionProgress.value * 0.18 }],
  }));
  const tailAnimatedStyle = useAnimatedStyle(() => ({
    opacity: selectionProgress.value,
    transform: [{ scale: 0.75 + selectionProgress.value * 0.25 }],
  }));

  const handlePressIn = useCallback(() => {
    animateScale(isCluster ? 0.97 : 0.95);
  }, [animateScale, isCluster]);

  const handlePressOut = useCallback(() => {
    animateScale(restingScale);
  }, [animateScale, restingScale]);

  const fillColor = isCluster
    ? '#FFFFFF'
    : !availabilityKnown
      ? '#F8FAFC'
    : moving
      ? theme.movingFill
      : theme.fill;
  const textColor = isCluster
    ? '#0F172A'
    : availabilityKnown
      ? theme.text
      : '#64748B';
  const borderColor = isCluster
    ? selected
      ? '#2563EB'
      : '#DBEAFE'
    : theme.border;
  const resolvedBorderColor =
    !isCluster && !availabilityKnown ? '#CBD5E1' : borderColor;

  return (
    <Animated.View
      style={[
        styles.canvas,
        {
          height: dimensions.canvasHeight,
          width: dimensions.canvasWidth,
        },
        animatedStyle,
      ]}
    >
      {!isCluster ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.selectedAura,
            {
              backgroundColor: theme.glow,
              height: (spotDimensions?.height ?? 0) + 8,
              width: (spotDimensions?.width ?? 0) + 8,
            },
            auraAnimatedStyle,
          ]}
        />
      ) : null}

      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        className={className}
        hitSlop={4}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.pressable,
          {
            height: dimensions.canvasHeight,
            width: dimensions.canvasWidth,
          },
        ]}
      >
        <View
          pointerEvents="none"
          style={[
            styles.pill,
            {
              backgroundColor: fillColor,
              borderColor: resolvedBorderColor,
              borderWidth: isCluster ? (selected ? 2 : 1) : selected ? 3.5 : 3,
              boxShadow: markerShadow(
                selected,
                moving,
                isCluster,
                isCluster
                  ? 'rgba(15, 23, 42, 0.28)'
                  : theme.glowStrong,
              ),
              elevation: isCluster ? (selected ? 8 : 6) : selected ? 5 : 3,
              height: dimensions.height,
              paddingLeft: clusterDimensions
                ? clusterDimensions.horizontalPadding + 12
                : undefined,
              paddingRight: clusterDimensions?.horizontalPadding,
              minWidth: clusterDimensions?.minWidth,
              width: spotDimensions?.width,
            },
          ]}
        >
          {isCluster ? (
            <View
              pointerEvents="none"
              style={[
                styles.clusterAccent,
                { backgroundColor: theme.fill },
              ]}
            />
          ) : null}
          <Text
            className="text-center font-black"
            numberOfLines={1}
            style={[
              styles.markerText,
              {
                color: textColor,
                fontSize: dimensions.font,
                lineHeight: dimensions.font + 2,
              },
            ]}
          >
            {isCluster
              ? formatParkingAreaCount(clusterCount)
              : availabilityKnown
                ? `${clampedPercentage}%`
                : '—'}
          </Text>
        </View>

        {!isCluster ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.tailContainer, tailAnimatedStyle]}
          >
            <View
              style={[
                styles.tail,
                styles.tailBorder,
                { borderTopColor: '#FFFFFF' },
              ]}
            />
            <View
              style={[
                styles.tail,
                styles.tailFill,
                { borderTopColor: fillColor },
              ]}
            />
          </Animated.View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    overflow: 'visible',
  },
  markerText: {
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.45,
  },
  clusterAccent: {
    borderRadius: 999,
    height: 7,
    left: 12,
    opacity: 0.95,
    position: 'absolute',
    width: 7,
  },
  pill: {
    alignItems: 'center',
    borderRadius: 999,
    justifyContent: 'center',
  },
  pressable: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    overflow: 'visible',
  },
  selectedAura: {
    borderRadius: 999,
    position: 'absolute',
    top: -4,
  },
  tail: {
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderStyle: 'solid',
    height: 0,
    position: 'absolute',
    width: 0,
  },
  tailBorder: {
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 11,
    left: -8,
    top: 0,
  },
  tailContainer: {
    height: 11,
    position: 'relative',
    width: 0,
  },
  tailFill: {
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 7,
    left: -5,
    top: -3,
  },
});

export default memo(ParkingAvailabilityBubble);
