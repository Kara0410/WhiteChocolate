import { memo } from 'react';
import { View } from 'react-native';

import { getAvailabilityTheme } from '@/components/parking-map/parking-availability-status';
import { COLORS } from '@/constants/theme';

export type ParkingAvailabilityBarProps = {
  percentage: number | null;
  /** Searching.svg reference size: 64x8, radius = height / 2. */
  width?: number;
  height?: number;
};

export const ParkingAvailabilityBar = memo(function ParkingAvailabilityBar({
  percentage,
  width = 64,
  height = 8,
}: ParkingAvailabilityBarProps) {
  const known = percentage !== null && Number.isFinite(percentage);
  const clamped = known
    ? Math.max(0, Math.min(100, Math.round(percentage)))
    : 0;
  const theme = known ? getAvailabilityTheme(clamped) : null;
  const trackColor = theme?.ringTrack ?? COLORS.status.unknownTrack;
  const fillColor = theme?.ring ?? COLORS.status.unknown;

  return (
    <View
      style={{
        backgroundColor: trackColor,
        borderRadius: height / 2,
        height,
        overflow: 'hidden',
        width,
      }}
    >
      {known ? (
        <View
          style={{
            backgroundColor: fillColor,
            borderRadius: height / 2,
            height: '100%',
            width: `${clamped}%`,
          }}
        />
      ) : null}
    </View>
  );
});
