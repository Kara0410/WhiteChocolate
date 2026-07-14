/**
 * Fresh occupancy check — full-screen modal launched from the map's
 * "I'm leaving now" FAB. Waits up to CHECK_SECONDS for a fresh report,
 * then falls back to the best standing prediction.
 */

import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, Stack } from 'expo-router';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const CHECK_SECONDS = 75;

export default function FreshCheckScreen() {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1600 }), -1, true);
    intervalRef.current = setInterval(() => {
      setElapsed((value) => Math.min(CHECK_SECONDS, value + 1));
    }, 1000);

    return () => {
      cancelAnimation(pulse);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [pulse]);

  useEffect(() => {
    if (elapsed >= CHECK_SECONDS) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      const timer = setTimeout(() => router.back(), 600);
      return () => clearTimeout(timer);
    }
  }, [elapsed]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.06 }],
  }));

  const remaining = CHECK_SECONDS - elapsed;
  const progressPct = Math.round((elapsed / CHECK_SECONDS) * 100);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 justify-end bg-warm-map-tint">
        <View className="m-[18px] mb-8 rounded-sheet border border-warm-panel-border bg-warm-panel p-5 shadow-warm-panel">
          <Animated.View
            className="mb-3.5 h-[82px] w-[82px] items-center justify-center rounded-full bg-warm-accent/20"
            style={ringStyle}
          >
            <View className="h-[46px] w-[46px] rounded-full bg-warm-accent" />
          </Animated.View>

          <Text className="mb-1.5 text-[12px] font-extrabold uppercase tracking-overline text-warm-accent-text">
            Fresh occupancy check
          </Text>
          <Text className="mb-2 font-display text-[24px] font-bold tracking-[-0.4px] text-warm-text">
            Checking nearby drivers…
          </Text>
          <Text className="mb-4 text-[14px] leading-5 text-warm-body-muted">
            We’ll wait up to {CHECK_SECONDS} seconds for a fresh report near your selected zone,
            then fall back to the best standing prediction.
          </Text>

          <View
            accessibilityLabel={`${remaining} seconds remaining`}
            className="mb-2.5 h-2.5 overflow-hidden rounded-full bg-warm-progress-track"
          >
            <View
              className="h-full rounded-full bg-warm-accent"
              style={{ width: `${progressPct}%` }}
            />
          </View>
          <View className="mb-4 flex-row justify-between">
            <Text className="text-[13px] font-bold text-warm-text">{elapsed}s elapsed</Text>
            <Text className="text-[13px] text-warm-muted">
              {elapsed >= CHECK_SECONDS ? 'Fallback estimate ready' : `${remaining}s remaining`}
            </Text>
          </View>

          <Pressable
            className="min-h-12 items-center justify-center rounded-control border border-warm-border bg-warm-cancel-surface"
            onPress={() => router.back()}
          >
            <Text className="text-[15px] font-black text-warm-deep">Cancel check</Text>
          </Pressable>
        </View>
      </View>
    </>
  );
}
