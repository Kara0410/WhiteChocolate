import React, { memo, useCallback, useEffect } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import {
  getAvailabilityStatus,
  getAvailabilityTheme,
  type AvailabilityStatus,
} from './parking-availability-status';

export type BubbleType = 'cluster' | 'spot';
export type BubbleSize = 'small' | 'medium' | 'large';
export type BubbleState = 'default' | 'pressed' | 'selected';

export type ParkingAvailabilityBubbleProps = {
  type: BubbleType;
  percentage: number;
  count?: number;
  zoneCount?: number;
  size?: BubbleSize;
  state?: BubbleState;
  performanceMode?: 'normal' | 'moving';
  className?: string;
  onPress?: () => void;
};

const CLUSTER_SIZE = {
  large: { canvasWidth: 70, canvasHeight: 44, width: 62, height: 38, font: 17 },
  medium: { canvasWidth: 62, canvasHeight: 42, width: 54, height: 36, font: 16 },
  small: { canvasWidth: 54, canvasHeight: 40, width: 46, height: 34, font: 15 },
} as const;

const SPOT_SIZE = {
  large: { canvasWidth: 78, canvasHeight: 50, width: 68, height: 36, font: 18 },
  medium: { canvasWidth: 72, canvasHeight: 50, width: 64, height: 34, font: 17 },
  small: { canvasWidth: 66, canvasHeight: 46, width: 58, height: 32, font: 16 },
} as const;

const SPRING_CONFIG = {
  damping: 17,
  stiffness: 280,
  mass: 0.65,
} as const;

export { getAvailabilityStatus };
export type { AvailabilityStatus };

function formatClusterCount(count: number) {
  const safeCount = normalizeClusterCount(count);
  return safeCount > 99 ? '99+' : `${safeCount}`;
}

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
  glowStrong: string,
): ViewStyle['boxShadow'] {
  if (moving) {
    return '0 1px 3px rgba(15, 23, 42, 0.18)';
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
  const clampedPercentage = clampPercentage(percentage);
  const theme = getAvailabilityTheme(clampedPercentage);
  const selected = state === 'selected';
  const forcedPressed = state === 'pressed';
  const moving = performanceMode === 'moving';
  const isCluster = type === 'cluster';
  const dimensions = isCluster ? CLUSTER_SIZE[size] : SPOT_SIZE[size];
  const restingScale = selected ? 1.12 : forcedPressed ? 0.95 : 1;
  const scale = useSharedValue(restingScale);
  const clusterCount = normalizeClusterCount(count ?? zoneCount);
  const label = isCluster
    ? `${clusterCount} parking ${clusterCount === 1 ? 'spot' : 'spots'}`
    : `${clampedPercentage}% parking availability`;

  const animateScale = useCallback(
    (toValue: number) => {
      scale.value = withSpring(toValue, SPRING_CONFIG);
    },
    [scale],
  );

  useEffect(() => {
    animateScale(restingScale);
  }, [animateScale, restingScale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    animateScale(0.95);
  }, [animateScale]);

  const handlePressOut = useCallback(() => {
    animateScale(restingScale);
  }, [animateScale, restingScale]);

  const fillColor = isCluster
    ? '#FFFFFF'
    : moving
      ? theme.movingFill
      : theme.fill;
  const textColor = isCluster ? '#172033' : theme.text;
  const borderColor = isCluster ? '#D7DCE3' : theme.border;

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
      {!isCluster && selected && !moving ? (
        <View
          pointerEvents="none"
          style={[
            styles.selectedAura,
            {
              backgroundColor: theme.glow,
              height: dimensions.height + 8,
              width: dimensions.width + 8,
            },
          ]}
        />
      ) : null}

      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
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
              borderColor,
              borderWidth: isCluster ? 1.5 : selected ? 3.5 : 3,
              boxShadow: markerShadow(
                selected,
                moving,
                isCluster
                  ? 'rgba(15, 23, 42, 0.28)'
                  : theme.glowStrong,
              ),
              height: dimensions.height,
              width: dimensions.width,
            },
          ]}
        >
          <Text
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
            {isCluster ? formatClusterCount(clusterCount) : `${clampedPercentage}%`}
          </Text>
        </View>

        {!isCluster && selected ? (
          <View pointerEvents="none" style={styles.tailContainer}>
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
          </View>
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
    fontWeight: '900',
    letterSpacing: -0.45,
    textAlign: 'center',
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
