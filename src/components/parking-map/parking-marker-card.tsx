import { memo, useCallback } from 'react';
import { View } from 'react-native';

import ParkingAvailabilityBubble, {
  type BubbleSize,
} from '@/components/parking-map/ParkingAvailabilityBubble';
import type { MarkerSizeTier } from '@/components/parking-map/marker-visuals';
import type { ParkingClusterResponse } from '@/types/parking-map';

type ParkingMarkerCardProps = {
  item: ParkingClusterResponse;
  moving: boolean;
  tier: MarkerSizeTier;
  selected: boolean;
  onPress: (item: ParkingClusterResponse) => void;
};

export const ParkingMarkerCard = memo(function ParkingMarkerCard({
  item,
  moving,
  tier,
  selected,
  onPress,
}: ParkingMarkerCardProps) {
  const size: BubbleSize = tier === 'spot' ? 'large' : tier;
  const handlePress = useCallback(() => onPress(item), [item, onPress]);

  return (
    <View>
      <ParkingAvailabilityBubble
        onPress={handlePress}
        percentage={item.availabilityPercent}
        performanceMode={moving ? 'moving' : 'normal'}
        size={size}
        state={selected ? 'selected' : 'default'}
        type={item.type}
        zoneCount={item.zoneCount}
      />
    </View>
  );
});
