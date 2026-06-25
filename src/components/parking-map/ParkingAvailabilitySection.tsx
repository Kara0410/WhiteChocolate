import { memo } from 'react';
import { Text, View } from 'react-native';

import type { AvailabilityTheme } from './parking-availability-status';

export type ParkingAvailabilitySectionProps = {
  percentage: number;
  theme: AvailabilityTheme;
};

export const ParkingAvailabilitySection = memo(
  function ParkingAvailabilitySection({
    percentage,
    theme,
  }: ParkingAvailabilitySectionProps) {
    return (
      <View>
        <Text
          className="text-[15px] font-bold"
          style={{ color: theme.text, fontVariant: ['tabular-nums'] }}
        >
          {percentage}% available
        </Text>
        <View className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
          <View
            className="h-full rounded-full"
            style={{
              backgroundColor: theme.ring,
              width: `${percentage}%`,
            }}
          />
        </View>
      </View>
    );
  },
);
