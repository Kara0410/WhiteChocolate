import { memo } from 'react';
import { View } from 'react-native';

import {
  AVAILABILITY_PALETTES,
  MarkerText,
} from '@/components/parking-map/marker-theme';
import type { ParkingClusterResponse } from '@/types/parking-map';

export const IndividualSpotMarker = memo(function IndividualSpotMarker({
  item,
  zoom,
}: {
  item: ParkingClusterResponse;
  zoom: number;
}) {
  const palette = AVAILABILITY_PALETTES[item.colorStatus];
  const size = zoom >= 18 ? 50 : 46;

  return (
    <View
      style={{
        width: size + 8,
        height: size + 8,
        borderRadius: (size + 8) / 2,
        backgroundColor: palette.aura,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.9)',
          backgroundColor: palette.surface,
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 5px 16px ${palette.aura}`,
        }}
      >
        <MarkerText color={palette.deep} size={15}>
          {item.availabilityPercent}%
        </MarkerText>
      </View>
    </View>
  );
});
