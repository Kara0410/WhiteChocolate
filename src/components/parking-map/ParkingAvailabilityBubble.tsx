import React, { memo, useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import {
  getAvailabilityStatus,
  getAvailabilityTheme,
  type AvailabilityStatus,
  type AvailabilityTheme,
} from './parking-availability-status';

export type BubbleType = 'cluster' | 'spot';
export type BubbleSize = 'small' | 'medium' | 'large';
export type BubbleState = 'default' | 'pressed' | 'selected';

export type ParkingAvailabilityBubbleProps = {
  type: BubbleType;
  percentage: number;
  zoneCount?: number;
  size?: BubbleSize;
  state?: BubbleState;
  className?: string;
  onPress?: () => void;
};

const CLUSTER_SIZE = {
  large: {
    width: 164,
    height: 78,
    radius: 39,
    ring: 58,
    ringStroke: 6,
    percentage: 30,
    zone: 16,
    gap: 12,
    paddingHorizontal: 10,
  },
  medium: {
    width: 136,
    height: 64,
    radius: 32,
    ring: 46,
    ringStroke: 5,
    percentage: 24,
    zone: 13,
    gap: 10,
    paddingHorizontal: 9,
  },
  small: {
    width: 108,
    height: 52,
    radius: 26,
    ring: 34,
    ringStroke: 4,
    percentage: 18,
    zone: 10,
    gap: 7,
    paddingHorizontal: 8,
  },
} as const;

const SPOT_SIZE = {
  large: { diameter: 72, percentage: 22 },
  medium: { diameter: 56, percentage: 18 },
  small: { diameter: 44, percentage: 14 },
} as const;

export { getAvailabilityStatus };
export type { AvailabilityStatus };

function AvailabilityRing({
  percentage,
  size,
  strokeWidth,
  theme,
}: {
  percentage: number;
  size: number;
  strokeWidth: number;
  theme: AvailabilityTheme;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - percentage / 100);
  const center = size / 2;

  return (
    <Svg height={size} width={size}>
      <Circle
        cx={center}
        cy={center}
        fill="rgba(255,255,255,0.64)"
        r={radius - strokeWidth / 2}
      />
      <Circle
        cx={center}
        cy={center}
        fill="transparent"
        r={radius}
        stroke={theme.ringTrack}
        strokeWidth={strokeWidth}
      />
      <Circle
        cx={center}
        cy={center}
        fill="transparent"
        origin={`${center}, ${center}`}
        r={radius}
        rotation={-90}
        stroke={theme.ring}
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        strokeWidth={strokeWidth}
      />
      <Circle
        cx={center}
        cy={center}
        fill="transparent"
        r={radius - strokeWidth - 1}
        stroke="rgba(255,255,255,0.72)"
        strokeWidth={1}
      />
    </Svg>
  );
}

function getOuterStyle(
  width: number,
  height: number,
  radius: number,
  theme: AvailabilityTheme,
  selected: boolean,
  active: boolean,
): ViewStyle {
  const glow = selected ? theme.glowStrong : theme.glow;

  return {
    width,
    height,
    borderRadius: radius,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: selected ? 16 : active ? 12 : 10,
    shadowColor: selected ? '#1A1C1E' : theme.ring,
    shadowOffset: {
      width: 0,
      height: selected ? 14 : active ? 8 : 12,
    },
    shadowOpacity: selected ? 0.75 : active ? 0.65 : 0.55,
    shadowRadius: selected ? 32 : active ? 18 : 22,
    boxShadow: selected
      ? `0 14px 32px 4px rgba(26, 28, 30, 0.75), 0 8px 24px 3px ${glow}`
      : active
        ? `0 12px 18px 3px ${glow}, 0 4px 12px rgba(26, 28, 30, 0.16)`
        : `0 12px 22px 4px ${glow}, 0 4px 14px rgba(26, 28, 30, 0.14)`,
  };
}

function ParkingAvailabilityBubble({
  type,
  percentage,
  zoneCount = 0,
  size = 'medium',
  state = 'default',
  className,
  onPress,
}: ParkingAvailabilityBubbleProps) {
  const clampedPercentage = Math.min(100, Math.max(0, percentage));
  const theme = getAvailabilityTheme(clampedPercentage);
  const selected = state === 'selected';
  const forcedPressed = state === 'pressed';
  const scale = useRef(
    new Animated.Value(selected ? 1.12 : forcedPressed ? 0.96 : 1),
  ).current;
  const dimensions =
    type === 'cluster'
      ? {
          width: CLUSTER_SIZE[size].width,
          height: CLUSTER_SIZE[size].height,
          radius: CLUSTER_SIZE[size].radius,
        }
      : {
          width: SPOT_SIZE[size].diameter,
          height: SPOT_SIZE[size].diameter,
          radius: SPOT_SIZE[size].diameter / 2,
        };

  const animateScale = useCallback(
    (toValue: number) => {
      Animated.spring(scale, {
        toValue,
        damping: 18,
        stiffness: 260,
        mass: 0.7,
        useNativeDriver: true,
      }).start();
    },
    [scale],
  );

  useEffect(() => {
    animateScale(selected ? 1.12 : forcedPressed ? 0.96 : 1);
  }, [animateScale, forcedPressed, selected]);

  const handlePressIn = useCallback(() => {
    if (!selected) {
      animateScale(0.96);
    }
  }, [animateScale, selected]);

  const handlePressOut = useCallback(() => {
    animateScale(selected ? 1.12 : forcedPressed ? 0.96 : 1);
  }, [animateScale, forcedPressed, selected]);

  return (
    <Animated.View
      style={{
        width: dimensions.width,
        height: dimensions.height,
        transform: [{ scale }],
      }}
    >
      <Pressable
        accessibilityLabel={`${clampedPercentage}% parking availability${
          type === 'cluster'
            ? `, ${zoneCount} ${zoneCount === 1 ? 'zone' : 'zones'}`
            : ''
        }`}
        accessibilityRole="button"
        className={className}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={({ pressed }) =>
          getOuterStyle(
            dimensions.width,
            dimensions.height,
            dimensions.radius,
            theme,
            selected,
            pressed || forcedPressed,
          )
        }
      >
        {selected ? (
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject,
              styles.selectedAura,
              {
                borderRadius: dimensions.radius,
              },
            ]}
          />
        ) : null}

        <View
          pointerEvents="none"
          style={[
            styles.glassShell,
            {
              width: dimensions.width,
              height: dimensions.height,
              borderColor: selected
                ? 'rgba(255,255,255,0.95)'
                : 'rgba(255,255,255,0.82)',
              borderRadius: dimensions.radius,
              borderWidth: selected ? 2 : 1,
              backgroundColor: theme.backgroundTint,
            },
          ]}
        >
          <View
            style={[
              StyleSheet.absoluteFillObject,
              {
                borderColor: theme.border,
                borderRadius: dimensions.radius,
              },
              styles.statusBorder,
            ]}
          />
          <View
            style={[
              styles.whiteGlassLayer,
              {
                borderRadius: dimensions.radius,
                opacity: forcedPressed ? 0.32 : selected ? 0.52 : 0.43,
              },
            ]}
          />
          <View
            style={[
              styles.innerHighlight,
              {
                borderTopLeftRadius: dimensions.radius,
                borderTopRightRadius: dimensions.radius,
                height: dimensions.height * 0.48,
              },
            ]}
          />

          {type === 'cluster' ? (
            <View
              className="flex-row items-center"
              style={{
                gap: CLUSTER_SIZE[size].gap,
                paddingHorizontal: CLUSTER_SIZE[size].paddingHorizontal,
              }}
            >
              <AvailabilityRing
                percentage={clampedPercentage}
                size={CLUSTER_SIZE[size].ring}
                strokeWidth={CLUSTER_SIZE[size].ringStroke}
                theme={theme}
              />
              <View className="flex-1 justify-center">
                <Text
                  numberOfLines={1}
                  style={[
                    styles.percentageText,
                    {
                      color: theme.text,
                      fontSize: CLUSTER_SIZE[size].percentage,
                      lineHeight: CLUSTER_SIZE[size].percentage + 1,
                    },
                  ]}
                >
                  {clampedPercentage}%
                </Text>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.zoneText,
                    {
                      color: theme.text,
                      fontSize: CLUSTER_SIZE[size].zone,
                      lineHeight: CLUSTER_SIZE[size].zone + 3,
                    },
                  ]}
                >
                  {zoneCount} {zoneCount === 1 ? 'zone' : 'zones'}
                </Text>
              </View>
            </View>
          ) : (
            <Text
              numberOfLines={1}
              style={[
                styles.percentageText,
                {
                  color: theme.text,
                  fontSize: SPOT_SIZE[size].percentage,
                  lineHeight: SPOT_SIZE[size].percentage + 3,
                },
              ]}
            >
              {clampedPercentage}%
            </Text>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  glassShell: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  innerHighlight: {
    backgroundColor: 'rgba(255,255,255,0.42)',
    left: 2,
    position: 'absolute',
    right: 2,
    top: 1,
  },
  percentageText: {
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  selectedAura: {
    borderColor: '#1A1C1E',
    borderWidth: 6,
    opacity: 0.4,
    transform: [{ scale: 1.18 }],
  },
  statusBorder: {
    borderWidth: 1,
  },
  whiteGlassLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.68)',
  },
  zoneText: {
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    letterSpacing: -0.2,
    opacity: 0.82,
  },
});

export default memo(ParkingAvailabilityBubble);
