/**
 * Fresh occupancy check — full-screen modal launched from the map's
 * "I'm leaving now" FAB. Waits up to CHECK_SECONDS for a fresh report,
 * then falls back to the best standing prediction.
 */

import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, Stack } from 'expo-router';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { C, FONT_DISPLAY, R } from '@/constants/theme';

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

      const t = setTimeout(() => router.back(), 600);
      return () => clearTimeout(t);
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
      <View style={styles.screen}>
        <View style={styles.panel}>
          <Animated.View style={[styles.pulseRing, ringStyle]}>
            <View style={styles.pulseCore} />
          </Animated.View>

          <Text style={styles.micro}>Fresh occupancy check</Text>
          <Text style={styles.heading}>Checking nearby drivers…</Text>
          <Text style={styles.body}>
            We’ll wait up to {CHECK_SECONDS} seconds for a fresh report near your selected zone,
            then fall back to the best standing prediction.
          </Text>

          <View style={styles.progressWrap} accessibilityLabel={`${remaining} seconds remaining`}>
            <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
          </View>
          <View style={styles.timerRow}>
            <Text style={styles.timerStrong}>{elapsed}s elapsed</Text>
            <Text style={styles.timerMuted}>
              {elapsed >= CHECK_SECONDS ? 'Fallback estimate ready' : `${remaining}s remaining`}
            </Text>
          </View>

          <Pressable style={styles.cancelBtn} onPress={() => router.back()}>
            <Text style={styles.cancelBtnText}>Cancel check</Text>
          </Pressable>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.mapTint, justifyContent: 'flex-end' },
  panel: {
    margin: 18,
    marginBottom: 32,
    borderRadius: R.xl,
    padding: 20,
    backgroundColor: 'rgba(255,252,245,0.97)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    boxShadow: '0 12px 28px rgba(25,42,47,0.16)',
  },
  pulseRing: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: 'rgba(223,165,54,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  pulseCore: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: C.accent,
  },
  micro: { color: '#7C5F1E', fontSize: 12, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 6 },
  heading: { fontFamily: FONT_DISPLAY, color: C.text, fontSize: 24, fontWeight: '700', letterSpacing: -0.4, marginBottom: 8 },
  body: { color: '#536368', lineHeight: 20, fontSize: 14, marginBottom: 16 },
  progressWrap: { height: 10, borderRadius: 99, overflow: 'hidden', backgroundColor: 'rgba(32,56,66,0.14)', marginBottom: 9 },
  progressFill: { height: '100%', borderRadius: 99, backgroundColor: C.accent },
  timerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  timerStrong: { color: C.text, fontSize: 13, fontWeight: '700' },
  timerMuted: { color: C.muted, fontSize: 13 },
  cancelBtn: { minHeight: 48, borderRadius: R.md, borderWidth: 1, borderColor: C.border, backgroundColor: '#FFFAF0', alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { color: C.deep, fontWeight: '900', fontSize: 15 },
});
