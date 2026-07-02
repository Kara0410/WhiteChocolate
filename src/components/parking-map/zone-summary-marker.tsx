import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, {
  FadeOut,
  ReduceMotion,
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

const ENTERING_TRANSITION = ZoomIn.duration(180)
  .withInitialValues({ opacity: 0, transform: [{ scale: 0.92 }] })
  .reduceMotion(ReduceMotion.System);
const EXITING_TRANSITION = FadeOut.duration(140).reduceMotion(
  ReduceMotion.System,
);

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

  return (
    <Animated.View
      entering={ENTERING_TRANSITION}
      exiting={EXITING_TRANSITION}
      style={styles.canvas}
    >
      <Pressable
        accessibilityHint="Zooms the map into this parking zone"
        accessibilityLabel={`${summary.zoneName ?? 'Parking zone'}, ${label}`}
        accessibilityRole="button"
        hitSlop={6}
        onPress={handlePress}
        style={({ pressed }) => [styles.pill, pressed && styles.pillPressed]}
      >
        <Text numberOfLines={1} style={styles.label}>
          {label}
        </Text>
      </Pressable>
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
    color: '#FFFFFF',
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    letterSpacing: -0.2,
    lineHeight: 16,
  },
  pill: {
    alignItems: 'center',
    backgroundColor: '#1D4ED8',
    borderColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 999,
    borderWidth: 1.5,
    boxShadow: '0 3px 10px rgba(29, 78, 216, 0.35)',
    height: 32,
    justifyContent: 'center',
    minWidth: 92,
    paddingHorizontal: 14,
  },
  pillPressed: {
    backgroundColor: '#1E40AF',
    transform: [{ scale: 0.95 }],
  },
});
