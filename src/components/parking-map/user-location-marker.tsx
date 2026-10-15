import { memo } from 'react';
import { View } from 'react-native';

import { COLORS, SHADOWS } from '@/constants/theme';

export const UserLocationMarker = memo(function UserLocationMarker() {
  return (
    <View
      accessibilityLabel="Your current location"
      accessibilityRole="image"
      accessible
      className="h-[25px] w-[25px] items-center justify-center"
      pointerEvents="none"
    >
      <View
        className="h-[19px] w-[19px] items-center justify-center rounded-[9.5px] bg-surface-default"
        style={{ boxShadow: SHADOWS.marker }}
      >
        <View
          className="h-[13px] w-[13px] rounded-[6.5px]"
          style={{ backgroundColor: COLORS.accent.primary }}
        />
      </View>
    </View>
  );
});
