import { memo } from 'react';
import { MapPin } from 'lucide-react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { View } from 'react-native';
import { COLORS } from '@/constants/theme';

const DESTINATION_ENTERING_TRANSITION = ZoomIn.duration(170).withInitialValues({
  opacity: 0,
  transform: [{ scale: 0.92 }],
});

export const SearchDestinationMarker = memo(
  function SearchDestinationMarker() {
    return (
      <View
        className="h-11 w-10 items-center"
        pointerEvents="none"
      >
        <Animated.View
          entering={DESTINATION_ENTERING_TRANSITION}
          className="shadow-marker"
        >
          <MapPin
            color={COLORS.surface.default}
            fill={COLORS.accent.primary}
            size={38}
            strokeWidth={1.8}
          />
          <View className="absolute left-[15px] top-[11px] h-2 w-2 rounded-full bg-surface-default" />
        </Animated.View>
      </View>
    );
  },
);
