import { memo, useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

export const UserLocationMarker = memo(function UserLocationMarker() {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1_600 }), -1, false);

    return () => cancelAnimation(pulse);
  }, [pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.34, 0]),
    transform: [
      { scale: interpolate(pulse.value, [0, 1], [1, 2.25]) },
    ],
  }));

  return (
    <View
      accessibilityLabel="Your current location"
      className="h-7 w-7 items-center justify-center"
      pointerEvents="none"
    >
      <Animated.View
        className="absolute h-5 w-5 rounded-[10px] bg-brand-500/30"
        style={pulseStyle}
      />
      <View className="h-[18px] w-[18px] rounded-[9px] border-[3px] border-white bg-brand-600 shadow-location-marker" />
    </View>
  );
});
