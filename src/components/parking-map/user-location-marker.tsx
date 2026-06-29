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
      pointerEvents="none"
      style={{
        alignItems: 'center',
        height: 28,
        justifyContent: 'center',
        width: 28,
      }}
    >
      <Animated.View
        style={[
          {
            backgroundColor: 'rgba(37, 99, 235, 0.28)',
            borderRadius: 10,
            height: 20,
            position: 'absolute',
            width: 20,
          },
          pulseStyle,
        ]}
      />
      <View
        style={{
          backgroundColor: '#2563EB',
          borderColor: '#FFFFFF',
          borderRadius: 9,
          borderWidth: 3,
          boxShadow: '0 1px 4px rgba(15,23,42,0.35)',
          height: 18,
          width: 18,
        }}
      />
    </View>
  );
});
