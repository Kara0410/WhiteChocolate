import { memo, useEffect, useRef } from 'react';
import { Animated } from 'react-native';

import ParkingAvailabilityBubble, {
  type BubbleSize,
} from '@/components/parking-map/ParkingAvailabilityBubble';
import { getMarkerSizeTier } from '@/components/parking-map/marker-visuals';
import type { ParkingClusterResponse } from '@/types/parking-map';

type ParkingMarkerCardProps = {
  item: ParkingClusterResponse;
  zoom: number;
  selected: boolean;
  onPress: (item: ParkingClusterResponse) => void;
};

export const ParkingMarkerCard = memo(function ParkingMarkerCard({
  item,
  zoom,
  selected,
  onPress,
}: ParkingMarkerCardProps) {
  const scale = useRef(new Animated.Value(0.92)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;
  const tier = getMarkerSizeTier(item.type, zoom);
  const size: BubbleSize = tier === 'spot' ? 'large' : tier;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        damping: 20,
        stiffness: 240,
        mass: 0.68,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        damping: 20,
        stiffness: 220,
        mass: 0.72,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, scale, translateY]);

  return (
    <Animated.View
      style={{ opacity, transform: [{ translateY }, { scale }] }}
    >
      <ParkingAvailabilityBubble
        onPress={() => onPress(item)}
        percentage={item.availabilityPercent}
        size={size}
        state={selected ? 'selected' : 'default'}
        type={item.type}
        zoneCount={item.zoneCount}
      />
    </Animated.View>
  );
});
