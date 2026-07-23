import { memo, useCallback } from 'react';
import Animated, { ReduceMotion, ZoomIn } from 'react-native-reanimated';

import ParkingAvailabilityBubble, {
  type BubbleSize,
} from '@/components/parking-map/ParkingAvailabilityBubble';
import type { MarkerSizeTier } from '@/components/parking-map/marker-visuals';
import type { ParkingClusterResponse } from '@/types/parking-map';

type ParkingMarkerCardProps = {
  item: ParkingClusterResponse;
  performanceMode: 'normal' | 'moving';
  tier: MarkerSizeTier;
  selected: boolean;
  onPress: (item: ParkingClusterResponse) => void;
};

const MARKER_ENTERING_TRANSITION = ZoomIn.duration(200)
  .withInitialValues({
    opacity: 0,
    transform: [{ scale: 0.92 }],
  })
  .reduceMotion(ReduceMotion.System);

export const ParkingMarkerCard = memo(function ParkingMarkerCard({
  item,
  performanceMode,
  tier,
  selected,
  onPress,
}: ParkingMarkerCardProps) {
  const size: BubbleSize = tier === 'spot' ? 'large' : tier;
  const handlePress = useCallback(() => onPress(item), [item, onPress]);

  return (
    <Animated.View
      entering={
        performanceMode === 'moving' ? undefined : MARKER_ENTERING_TRANSITION
      }
    >
      <ParkingAvailabilityBubble
        count={item.spotCount ?? item.count}
        onPress={handlePress}
        percentage={
          item.availabilityStatus === 'unknown'
            ? null
            : item.availabilityPercent
        }
        performanceMode={performanceMode}
        size={size}
        state={selected ? 'selected' : 'default'}
        type={item.type}
      />
    </Animated.View>
  );
});
