import {
  AccessibilityInfo,
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from 'expo-glass-effect';
import { useEffect, useState, type ReactNode } from 'react';

import { COLORS, GLASS, RADII, SHADOWS } from '@/constants/theme';

export type GlassSurfaceVariant =
  | 'search'
  | 'navigation'
  | 'floatingAction'
  | 'card'
  | 'sheet'
  | 'modal'
  | 'listCard';

type GlassSurfaceProps = {
  children?: ReactNode;
  pointerEvents?: 'auto' | 'none' | 'box-none' | 'box-only';
  style?: StyleProp<ViewStyle>;
  variant?: GlassSurfaceVariant;
};

type SurfaceRenderer = 'blur' | 'flat';

const VARIANTS: Record<
  GlassSurfaceVariant,
  {
    backgroundColor: string;
    borderRadius: number;
    intensity: number;
    nativeGlass: boolean;
    renderer: SurfaceRenderer;
  }
> = {
  search: {
    backgroundColor: COLORS.surface.glass,
    borderRadius: RADII.search,
    intensity: GLASS.blurIntensity,
    nativeGlass: true,
    renderer: 'blur',
  },
  navigation: {
    backgroundColor: COLORS.surface.glass,
    borderRadius: RADII.navigation,
    intensity: GLASS.blurIntensity,
    nativeGlass: true,
    renderer: 'blur',
  },
  floatingAction: {
    backgroundColor: COLORS.surface.glassTint,
    borderRadius: RADII.floating,
    intensity: GLASS.blurIntensity,
    nativeGlass: true,
    renderer: 'blur',
  },
  card: {
    backgroundColor: COLORS.surface.glassReadable,
    borderRadius: RADII.card,
    intensity: 24,
    nativeGlass: true,
    renderer: 'blur',
  },
  // One blurred sheet surface limits map-label bleed-through; list rows sit above it
  // without their own backdrop captures.
  sheet: {
    backgroundColor: COLORS.surface.glassSheet,
    borderRadius: RADII.sheet,
    intensity: 20,
    nativeGlass: true,
    renderer: 'blur',
  },
  modal: {
    backgroundColor: COLORS.surface.glassReadable,
    borderRadius: RADII.card,
    intensity: 30,
    nativeGlass: true,
    renderer: 'blur',
  },
  // Repeated rows stay crisp and avoid one backdrop capture per row. The single sheet
  // surface provides the frost; these use a restrained, high-legibility glass tint.
  listCard: {
    backgroundColor: COLORS.surface.glassCard,
    borderRadius: RADII.listCard,
    intensity: 0,
    nativeGlass: false,
    renderer: 'flat',
  },
};

export function useReduceTransparency() {
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
  const useNativeGlass =
    !reduceTransparency &&
    configuration.nativeGlass &&
    Platform.OS === 'ios' &&
    isLiquidGlassAvailable() &&
    isGlassEffectAPIAvailable();
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
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.clip, { borderRadius: configuration.borderRadius }]}
      >
        {reduceTransparency ? (
          <View
            style={[StyleSheet.absoluteFill, { backgroundColor: solidFallback }]}
          />
        ) : useNativeGlass ? (
          <GlassView
            glassEffectStyle="regular"
            style={StyleSheet.absoluteFill}
            tintColor={configuration.backgroundColor}
          />
        ) : configuration.renderer === 'blur' ? (
          <BlurView
            blurReductionFactor={GLASS.blurReductionFactor}
            experimentalBlurMethod={
              Platform.OS === 'android' ? 'dimezisBlurView' : 'none'
            }
            intensity={configuration.intensity}
            style={StyleSheet.absoluteFill}
            tint="light"
          />
        ) : (
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: configuration.backgroundColor },
            ]}
          />
        )}
        {!reduceTransparency && !useNativeGlass && configuration.renderer === 'blur' ? (
          <View
            style={[
              StyleSheet.absoluteFill,
              styles.tint,
              {
                backgroundColor: configuration.backgroundColor,
                borderRadius: configuration.borderRadius,
              },
            ]}
          />
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderColor: COLORS.border.glass,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
  },
  clip: {
    overflow: 'hidden',
  },
  tint: {
    borderColor: COLORS.border.glass,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
