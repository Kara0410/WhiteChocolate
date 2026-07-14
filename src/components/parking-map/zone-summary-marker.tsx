import { memo, useCallback } from 'react';
import { Pressable, Text } from 'react-native';
import Animated, {
  FadeOut,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  ZoomIn,
} from 'react-native-reanimated';

import type { ParkingZoneSummary } from '@/types/parking-domain';
import { formatParkingAggregateCount } from '@/utils/parking-domain';

/**
 * Fixed footprint so the overlay layer can center the pill on the zone
 * anchor without measuring. Wide enough for a compact capacity or area label.
 */
export const ZONE_SUMMARY_MARKER_SIZE = { width: 104, height: 40 } as const;

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
  const label = formatParkingAggregateCount(summary.stats);
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
      className="items-center justify-center"
      entering={ENTERING_TRANSITION}
      exiting={EXITING_TRANSITION}
      style={{
        height: ZONE_SUMMARY_MARKER_SIZE.height,
        width: ZONE_SUMMARY_MARKER_SIZE.width,
      }}
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
          className="h-9 min-w-[92px] items-center justify-center rounded-full border border-brand-100 bg-white px-3.5 shadow-marker-zone"
          style={({ pressed }) =>
            pressed
              ? {
                  borderColor: '#2563EB',
                  boxShadow: '0 9px 20px rgba(37,99,235,0.24)',
                  elevation: 7,
                }
              : undefined
          }
        >
          <Text
            className="text-[13px] font-extrabold leading-4 text-ink-900"
            numberOfLines={1}
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {label}
          </Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
});
