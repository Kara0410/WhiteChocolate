import { memo, useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import type { ParkingCellSummary } from '@/types/parking-domain';
import { formatParkingAggregateCount } from '@/utils/parking-domain';

export const CELL_SUMMARY_MARKER_SIZE = { width: 112, height: 44 } as const;

export const CellSummaryMarker = memo(function CellSummaryMarker({
  summary,
  onPress,
}: {
  summary: ParkingCellSummary;
  onPress: (summary: ParkingCellSummary) => void;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const label = formatParkingAggregateCount(summary.stats);
  const handlePress = useCallback(() => onPress(summary), [onPress, summary]);

  return (
    <Animated.View
      className="items-center justify-center"
      style={[{ height: CELL_SUMMARY_MARKER_SIZE.height, width: CELL_SUMMARY_MARKER_SIZE.width }, animatedStyle]}
    >
      <Pressable
        accessibilityHint="Zooms into parking areas in this map cell"
        accessibilityLabel={label}
        accessibilityRole="button"
        hitSlop={6}
        onPress={handlePress}
        onPressIn={() => {
          scale.value = withSpring(0.96, {
            damping: 18,
            stiffness: 320,
            reduceMotion: ReduceMotion.System,
          });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, {
            damping: 18,
            stiffness: 320,
            reduceMotion: ReduceMotion.System,
          });
        }}
        className="h-[38px] max-w-[112px] flex-row items-center justify-center rounded-full border border-brand-300 bg-brand-50 px-3 shadow-marker-cell"
      >
        <View className="mr-[7px] h-[7px] w-[7px] rounded-full bg-brand-500" />
        <Text
          className="text-[12px] font-extrabold leading-[15px] text-brand-950"
          numberOfLines={1}
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
});
