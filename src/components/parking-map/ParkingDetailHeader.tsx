import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Heart, Navigation, Share2, X } from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';

import type { AvailabilityTheme } from './parking-availability-status';

export type ParkingDetailHeaderProps = {
  title: string;
  percentage: number | null;
  distanceLabel: string;
  theme: AvailabilityTheme;
  showMetrics?: boolean;
  onClose: () => void;
  onNavigate?: () => void;
  onShare?: () => void;
  onFavorite?: () => void;
  isFavorite?: boolean;
};

const RING_SIZE = 72;
const RING_STROKE = 7;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export const ParkingDetailHeader = memo(function ParkingDetailHeader({
  title,
  percentage,
  distanceLabel,
  theme,
  showMetrics = true,
  onClose,
  onNavigate,
  onShare,
  onFavorite,
  isFavorite = false,
}: ParkingDetailHeaderProps) {
  const ringOffset =
    percentage === null
      ? RING_CIRCUMFERENCE
      : RING_CIRCUMFERENCE *
        (1 - Math.max(0, Math.min(100, percentage)) / 100);

  return (
    <View className="px-5 pb-5 pt-2">
      <View className="flex-row items-start justify-between">
        <Text
          className="flex-1 pr-3 text-[20px] font-bold text-slate-950"
          numberOfLines={2}
        >
          {title}
        </Text>
        <View className="flex-row gap-2">
          {onShare ? (
            <Pressable
              accessibilityLabel="Share parking location"
              accessibilityRole="button"
              className="h-9 w-9 items-center justify-center rounded-full bg-blue-50 active:bg-blue-100"
              hitSlop={6}
              onPress={onShare}
            >
              <Share2 color="#2563EB" size={17} strokeWidth={2.3} />
            </Pressable>
          ) : null}
          {onFavorite ? (
            <Pressable
              accessibilityLabel={
                isFavorite
                  ? 'Remove parking location from favorites'
                  : 'Add parking location to favorites'
              }
              accessibilityRole="button"
              className="h-9 w-9 items-center justify-center rounded-full bg-blue-50 active:bg-blue-100"
              hitSlop={6}
              onPress={onFavorite}
            >
              <Heart
                color="#2563EB"
                fill={isFavorite ? '#2563EB' : 'transparent'}
                size={17}
                strokeWidth={2.3}
              />
            </Pressable>
          ) : null}
          <Pressable
            accessibilityLabel="Close parking details"
            accessibilityRole="button"
            className="h-9 w-9 items-center justify-center rounded-full bg-slate-200/80"
            hitSlop={8}
            onPress={onClose}
          >
            <X color="#475569" size={18} strokeWidth={2.5} />
          </Pressable>
        </View>
      </View>

      {showMetrics ? (
        <View className="mt-3 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <View className="items-center justify-center">
              <Svg
                height={RING_SIZE}
                style={{ transform: [{ rotate: '-90deg' }] }}
                width={RING_SIZE}
              >
                <Circle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  fill="rgba(255,255,255,0.9)"
                  r={RING_RADIUS}
                  stroke={theme.ringTrack}
                  strokeWidth={RING_STROKE}
                />
                <Circle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  fill="none"
                  r={RING_RADIUS}
                  stroke={theme.ring}
                  strokeDasharray={`${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
                  strokeDashoffset={ringOffset}
                  strokeLinecap="round"
                  strokeWidth={RING_STROKE}
                />
              </Svg>
              <Text
                className="absolute text-[17px] font-extrabold"
                style={{
                  color: theme.text,
                  fontVariant: ['tabular-nums'],
                  letterSpacing: -0.5,
                }}
              >
                {percentage === null ? '—' : `${percentage}%`}
              </Text>
            </View>
            <Text
              className="ml-3 text-[14px] font-semibold"
              style={{ color: theme.text }}
            >
              {percentage === null ? 'Estimate unavailable' : 'Estimated availability'}
            </Text>
          </View>

          <Text className="ml-4 flex-1 text-right text-[13px] font-semibold text-blue-600">
            {distanceLabel}
          </Text>
        </View>
      ) : null}

      <Pressable
        accessibilityLabel="Navigate to parking spot"
        accessibilityRole="button"
        className="mt-5 h-14 flex-row items-center justify-center rounded-2xl bg-blue-600 active:bg-blue-700"
        onPress={onNavigate}
        style={{ borderCurve: 'continuous' }}
      >
        <Navigation color="#FFFFFF" fill="#FFFFFF" size={18} />
        <Text className="ml-2 text-[16px] font-bold text-white">
          Navigate to spot
        </Text>
      </Pressable>
    </View>
  );
});
