import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, {
  FadeOut,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  ZoomIn,
} from 'react-native-reanimated';

import { formatSpotCount } from '@/components/parking-map/marker-visuals';
import type { ParkingZoneSummary } from '@/utils/parking-zones';

/**
 * Fixed footprint so the overlay layer can center the pill on the zone
 * anchor without measuring. Wide enough for the longest label ("50+ Spots").
 */
export const ZONE_SUMMARY_MARKER_SIZE = { width: 104, height: 40 } as const;

export const ZONE_SUMMARY_SPOT_CAP = 50;

type ZoneSummaryMarkerProps = {
  summary: ParkingZoneSummary;
  onPress: (summary: ParkingZoneSummary) => void;
};

const ENTERING_TRANSITION = ZoomIn.duration(200)
  .withInitialValues({ opacity: 0, transform: [{ scale: 0.92 }] })
  .reduceMotion(ReduceMotion.System);
const EXITING_TRANSITION = FadeOut.duration(150).reduceMotion(
  ReduceMotion.System,
);
const PRESS_SPRING_CONFIG = {
  damping: 18,
  stiffness: 320,
  mass: 0.6,
  reduceMotion: ReduceMotion.System,
} as const;

export const ZoneSummaryMarker = memo(function ZoneSummaryMarker({
  summary,
  onPress,
}: ZoneSummaryMarkerProps) {
  const handlePress = useCallback(
    () => onPress(summary),
    [onPress, summary],
  );
  const label = formatSpotCount(summary.spotCount, {
    capped: true,
    cap: ZONE_SUMMARY_SPOT_CAP,
  });
  const pressScale = useSharedValue(1);
  const animatedPressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));
  const handlePressIn = useCallback(() => {
    pressScale.value = withSpring(0.96, PRESS_SPRING_CONFIG);
  }, [pressScale]);
  const handlePressOut = useCallback(() => {
    pressScale.value = withSpring(1, PRESS_SPRING_CONFIG);
  }, [pressScale]);

  return (
    <Animated.View
      entering={ENTERING_TRANSITION}
      exiting={EXITING_TRANSITION}
      style={styles.canvas}
    >
      <Animated.View style={animatedPressStyle}>
        <Pressable
          accessibilityHint="Zooms the map into this parking zone"
          accessibilityLabel={`${summary.zoneName ?? 'Parking zone'}, ${label}`}
          accessibilityRole="button"
          hitSlop={6}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={({ pressed }) => [
            styles.pill,
            pressed && styles.pillPressed,
          ]}
        >
          <Text numberOfLines={1} style={styles.label}>
            {label}
          </Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  canvas: {
    alignItems: 'center',
    height: ZONE_SUMMARY_MARKER_SIZE.height,
    justifyContent: 'center',
    width: ZONE_SUMMARY_MARKER_SIZE.width,
  },
  label: {
    color: '#0F172A',
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    letterSpacing: -0.3,
    lineHeight: 16,
  },
  pill: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#DBEAFE',
    borderRadius: 999,
    borderWidth: 1,
    boxShadow: '0 8px 18px rgba(15, 23, 42, 0.2)',
    elevation: 5,
    height: 36,
    justifyContent: 'center',
    minWidth: 92,
    paddingHorizontal: 14,
  },
  pillPressed: {
    borderColor: '#2563EB',
    boxShadow: '0 9px 20px rgba(37, 99, 235, 0.24)',
    elevation: 7,
  },
});
