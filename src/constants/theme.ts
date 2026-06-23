import { Platform } from 'react-native';

// Munich Parking App Design System — warm paper surfaces over a cool map tint.
// See Munich-Parking-App-Pages-App-2026-06-22-072318/DESIGN.md for the source tokens.
export const C = {
  bg:          '#E9E1D3',
  surface:     '#FFFCF5',
  surfaceWarm: '#F7F0E4',
  text:        '#172126',
  muted:       '#69767A',
  border:      '#D9CFC0',
  accent:      '#DFA536',
  deep:        '#203842',
  mapTint:     '#D7E6E9',
  low:         '#78AFC8',
  mid:         '#B7B068',
  high:        '#DFA536',
  unknown:     '#C9C4B8',
  dangerSoft:  '#F1D9CA',
  dangerText:  '#69462E',
  success:     '#34C759',
  warning:     '#FF9F0A',
  danger:      '#D92D20',
} as const;

export const R = {
  sm: 12,
  md: 16,
  lg: 22,
  xl: 30,
} as const;

export const SPACING = {
  xs: 6,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 40,
} as const;

// Georgia/Trebuchet MS are iOS system fonts; Android falls back to its closest
// built-in serif/sans-serif so the look survives without bundling custom fonts.
export const FONT_DISPLAY = Platform.select({ ios: 'Georgia', default: 'serif' });
export const FONT_BODY = Platform.select({ ios: 'Trebuchet MS', default: 'sans-serif' });

// Shadow-only token — each callsite sets its own backgroundColor
export const GLASS_CARD = {
  shadowColor:  '#192A2F',
  shadowOffset: { width: 0, height: 14 },
  shadowOpacity: 0.16 as number,
  shadowRadius:  36,
  elevation:     10,
} as const;

// Frosted-glass (expo-blur BlurView) tuning shared by glass surfaces
export const BLUR_INTENSITY = 50;
export const BLUR_TINT = 'light' as const;
export const GLASS_BORDER = 'rgba(255,255,255,0.55)';
