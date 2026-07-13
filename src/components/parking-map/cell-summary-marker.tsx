import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
    <Animated.View style={[styles.canvas, animatedStyle]}>
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
        style={styles.pill}
      >
        <View style={styles.accent} />
        <Text numberOfLines={1} style={styles.label}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  accent: {
    backgroundColor: '#3B82F6',
    borderRadius: 999,
    height: 7,
    marginRight: 7,
    width: 7,
  },
  canvas: {
    alignItems: 'center',
    height: CELL_SUMMARY_MARKER_SIZE.height,
    justifyContent: 'center',
    width: CELL_SUMMARY_MARKER_SIZE.width,
  },
  label: {
    color: '#172554',
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    lineHeight: 15,
  },
  pill: {
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
    borderRadius: 999,
    borderWidth: 1,
    boxShadow: '0 7px 16px rgba(30, 64, 175, 0.18)',
    elevation: 5,
    flexDirection: 'row',
    height: 38,
    justifyContent: 'center',
    maxWidth: CELL_SUMMARY_MARKER_SIZE.width,
    paddingHorizontal: 12,
  },
});
