import { memo } from 'react';
import { Text, View } from 'react-native';

import {
  AVAILABILITY_PALETTES,
  MarkerText,
} from '@/components/parking-map/marker-theme';
import type { ParkingClusterResponse } from '@/types/parking-map';

export const ClusterMarker = memo(function ClusterMarker({
  item,
  zoom,
}: {
  item: ParkingClusterResponse;
  zoom: number;
}) {
  const palette = AVAILABILITY_PALETTES[item.colorStatus];
  const width = zoom <= 10 ? 106 : zoom <= 13 ? 100 : 94;
  const height = zoom <= 10 ? 78 : zoom <= 13 ? 74 : 70;
  const price =
    item.minPrice === null ? 'Free' : `From €${item.minPrice.toFixed(2)}`;

  return (
    <View
      style={{
        width: width + 10,
        height: height + 10,
        borderRadius: 30,
        backgroundColor: palette.aura,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width,
          height,
          borderRadius: Math.min(28, height / 2),
          borderCurve: 'continuous',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.88)',
          backgroundColor: palette.surface,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
          boxShadow: `0 6px 18px ${palette.aura}`,
        }}
      >
        <MarkerText color={palette.deep} size={18}>
          {item.totalCapacity} spaces
        </MarkerText>
        <Text
          style={{
            color: palette.deep,
            fontSize: 10,
            fontWeight: '600',
            opacity: 0.78,
          }}
        >
          {item.availableSpots} free · {price}
        </Text>
        <Text
          style={{
            color: palette.deep,
            fontSize: 8,
            fontWeight: '600',
            opacity: 0.62,
          }}
        >
          {item.zoneCount ?? 0} {(item.zoneCount ?? 0) === 1 ? 'zone' : 'zones'}
        </Text>
      </View>
    </View>
  );
});
