export const C = {
  bg:      '#F7F8FC',
  surface: '#FFFFFF',
  text:    '#101828',
  muted:   '#667085',
  border:  '#D9E0EA',
  accent:  '#007AFF',
  success: '#34C759',
  warning: '#FF9F0A',
  danger:  '#D92D20',
} as const;

export const R = {
  sm: 14,
  md: 18,
  lg: 26,
  xl: 34,
} as const;

// Shadow-only token — each callsite sets its own backgroundColor
export const GLASS_CARD = {
  shadowColor:  '#1f2f46',
  shadowOffset: { width: 0, height: 14 },
  shadowOpacity: 0.16 as number,
  shadowRadius:  36,
  elevation:     10,
} as const;

// Frosted-glass (expo-blur BlurView) tuning shared by glass surfaces
export const BLUR_INTENSITY = 50;
export const BLUR_TINT = 'light' as const;
export const GLASS_BORDER = 'rgba(255,255,255,0.55)';
