import React, { memo } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import {
  getAvailabilityStatus,
  type AvailabilityStatus,
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

const STATUS_STYLE: Record<
  AvailabilityStatus,
  {
    text: string;
    ring: string;
    glow: string;
    tint: string;
  }
> = {
  high: {
    text: '#178A45',
    ring: '#34C759',
    glow: 'rgba(52,199,89,0.30)',
    tint: 'rgba(52,199,89,0.10)',
  },
  medium: {
    text: '#C76A00',
    ring: '#FF9500',
    glow: 'rgba(255,149,0,0.30)',
    tint: 'rgba(255,149,0,0.10)',
  },
  low: {
    text: '#D92D20',
    ring: '#FF3B30',
    glow: 'rgba(255,59,48,0.30)',
    tint: 'rgba(255,59,48,0.10)',
  },
};

const CLUSTER_SIZE = {
  large: {
    width: 148,
    height: 72,
    ring: 52,
    percentage: 28,
    zone: 14,
    gap: 12,
    padding: 10,
  },
  medium: {
    width: 124,
    height: 60,
    ring: 42,
    percentage: 22,
    zone: 12,
    gap: 9,
    padding: 8,
  },
  small: {
    width: 104,
    height: 48,
    ring: 34,
    percentage: 18,
    zone: 10,
    gap: 7,
    padding: 7,
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
  ringColor,
  size,
}: {
  percentage: number;
  ringColor: string;
  size: number;
}) {
  const strokeWidth = Math.max(3, Math.round(size * 0.1));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - percentage / 100);

  return (
    <Svg height={size} width={size}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        fill="transparent"
        r={radius}
        stroke={ringColor}
        strokeOpacity={0.18}
        strokeWidth={strokeWidth}
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        fill="transparent"
        r={radius}
        rotation={-90}
        origin={`${size / 2}, ${size / 2}`}
        stroke={ringColor}
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
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
  const status = getAvailabilityStatus(clampedPercentage);
  const palette = STATUS_STYLE[status];
  const selected = state === 'selected';
  const forcedPressed = state === 'pressed';

  return (
    <Pressable
      accessibilityLabel={`${clampedPercentage}% parking availability${
        type === 'cluster'
          ? `, ${zoneCount} ${zoneCount === 1 ? 'zone' : 'zones'}`
          : ''
      }`}
      accessibilityRole="button"
      className={className}
      onPress={onPress}
      style={({ pressed }) => {
        const active = pressed || forcedPressed;
        const scale = selected ? 1.08 : active ? 0.96 : 1;
        const dimensions =
          type === 'cluster'
            ? {
                width: CLUSTER_SIZE[size].width,
                height: CLUSTER_SIZE[size].height,
              }
            : {
                width: SPOT_SIZE[size].diameter,
                height: SPOT_SIZE[size].diameter,
              };

        return {
          ...dimensions,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: type === 'cluster' ? 'row' : 'column',
          gap: type === 'cluster' ? CLUSTER_SIZE[size].gap : 0,
          paddingHorizontal:
            type === 'cluster' ? CLUSTER_SIZE[size].padding : 0,
          borderRadius:
            type === 'cluster'
              ? CLUSTER_SIZE[size].height / 2
              : SPOT_SIZE[size].diameter / 2,
          borderCurve: 'continuous',
          borderWidth: selected ? 2 : 1,
          borderColor: selected
            ? 'rgba(255,255,255,1)'
            : 'rgba(255,255,255,0.88)',
          backgroundColor: active
            ? `rgba(255,255,255,0.86)`
            : 'rgba(255,255,255,0.78)',
          boxShadow: selected
            ? `0 12px 30px ${palette.glow}, 0 3px 10px rgba(18,31,46,0.16)`
            : `0 8px 22px ${palette.glow}, 0 2px 8px rgba(18,31,46,0.12)`,
          transform: [{ scale }],
        };
      }}
    >
      <View
        pointerEvents="none"
        className="absolute inset-0"
        style={{
          borderRadius:
            type === 'cluster'
              ? CLUSTER_SIZE[size].height / 2
              : SPOT_SIZE[size].diameter / 2,
          backgroundColor: palette.tint,
          opacity: selected ? 0.92 : forcedPressed ? 0.75 : 0.55,
        }}
      />

      {type === 'cluster' ? (
        <>
          <AvailabilityRing
            percentage={clampedPercentage}
            ringColor={palette.ring}
            size={CLUSTER_SIZE[size].ring}
          />
          <View className="flex-1 justify-center">
            <Text
              className="font-extrabold"
              style={{
                color: palette.text,
                fontSize: CLUSTER_SIZE[size].percentage,
                fontWeight: '800',
                fontVariant: ['tabular-nums'],
                letterSpacing: -0.8,
                lineHeight: CLUSTER_SIZE[size].percentage + 2,
              }}
            >
              {clampedPercentage}%
            </Text>
            <Text
              className="font-semibold"
              style={{
                color: '#243447',
                fontSize: CLUSTER_SIZE[size].zone,
                fontWeight: '600',
                lineHeight: CLUSTER_SIZE[size].zone + 3,
                opacity: 0.86,
              }}
            >
              {zoneCount} {zoneCount === 1 ? 'zone' : 'zones'}
            </Text>
          </View>
        </>
      ) : (
        <Text
          className="font-extrabold"
          style={{
            color: palette.text,
            fontSize: SPOT_SIZE[size].percentage,
            fontWeight: '800',
            fontVariant: ['tabular-nums'],
            letterSpacing: -0.6,
          }}
        >
          {clampedPercentage}%
        </Text>
      )}

      {selected ? (
        <View
          pointerEvents="none"
          className="absolute"
          style={{
            inset: -5,
            borderRadius:
              type === 'cluster'
                ? CLUSTER_SIZE[size].height / 2 + 5
                : SPOT_SIZE[size].diameter / 2 + 5,
            borderWidth: 2,
            borderColor: palette.ring,
            opacity: 0.2,
          }}
        />
      ) : null}
    </Pressable>
  );
}

export default memo(ParkingAvailabilityBubble);
