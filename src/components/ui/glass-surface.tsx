import {
  AccessibilityInfo,
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useEffect, useState, type ReactNode } from 'react';

import { COLORS, GLASS, RADII, SHADOWS } from '@/constants/theme';

export type GlassSurfaceVariant =
  | 'search'
  | 'navigation'
  | 'floatingAction'
  | 'card'
  | 'sheet'
  | 'modal';

type GlassSurfaceProps = {
  children?: ReactNode;
  pointerEvents?: 'auto' | 'none' | 'box-none' | 'box-only';
  style?: StyleProp<ViewStyle>;
  variant?: GlassSurfaceVariant;
};

const VARIANTS: Record<
  GlassSurfaceVariant,
  { backgroundColor: string; borderRadius: number; intensity: number }
> = {
  search: {
    backgroundColor: COLORS.surface.glass,
    borderRadius: RADII.search,
    intensity: GLASS.blurIntensity,
  },
  navigation: {
    backgroundColor: COLORS.surface.glass,
    borderRadius: RADII.navigation,
    intensity: GLASS.blurIntensity,
  },
  floatingAction: {
    backgroundColor: COLORS.surface.glassTint,
    borderRadius: RADII.floating,
    intensity: GLASS.blurIntensity,
  },
  card: {
    backgroundColor: COLORS.surface.glassReadable,
    borderRadius: RADII.card,
    intensity: 24,
  },
  sheet: {
    backgroundColor: COLORS.surface.glassReadable,
    borderRadius: RADII.sheet,
    intensity: 30,
  },
  modal: {
    backgroundColor: COLORS.surface.glassReadable,
    borderRadius: RADII.card,
    intensity: 30,
  },
};

function useReduceTransparency() {
  const [reduceTransparency, setReduceTransparency] = useState(false);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceTransparencyEnabled().then((enabled) => {
      if (mounted) {
        setReduceTransparency(enabled);
      }
    });
    const subscription = AccessibilityInfo.addEventListener(
      'reduceTransparencyChanged',
      setReduceTransparency,
    );

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reduceTransparency;
}

export function GlassSurface({
  children,
  pointerEvents = 'auto',
  style,
  variant = 'card',
}: GlassSurfaceProps) {
  const reduceTransparency = useReduceTransparency();
  const configuration = VARIANTS[variant];
  const solidFallback =
    variant === 'floatingAction'
      ? COLORS.accent.soft
      : COLORS.surface.default;

  return (
    <View
      pointerEvents={pointerEvents}
      style={[
        styles.shell,
        {
          borderRadius: configuration.borderRadius,
          boxShadow: SHADOWS.glass,
        },
        style,
      ]}
    >
      {reduceTransparency ? (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            {
              backgroundColor: solidFallback,
              borderRadius: configuration.borderRadius,
            },
          ]}
        />
      ) : (
        <BlurView
          blurReductionFactor={GLASS.blurReductionFactor}
          experimentalBlurMethod={
            Platform.OS === 'android' ? 'dimezisBlurView' : 'none'
          }
          intensity={configuration.intensity}
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            {
              borderRadius: configuration.borderRadius,
              overflow: 'hidden',
            },
          ]}
          tint="extraLight"
        />
      )}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          styles.tint,
          {
            backgroundColor: reduceTransparency
              ? 'transparent'
              : configuration.backgroundColor,
            borderRadius: configuration.borderRadius,
          },
        ]}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderColor: COLORS.border.glass,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  tint: {
    borderColor: COLORS.border.glass,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
