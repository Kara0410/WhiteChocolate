export type AvailabilityStatus = 'high' | 'medium' | 'low';

export type AvailabilityTheme = {
  text: string;
  ring: string;
  ringTrack: string;
  glow: string;
  glowStrong: string;
  backgroundTint: string;
  border: string;
};

export const AVAILABILITY_THEME: Record<
  AvailabilityStatus,
  AvailabilityTheme
> = {
  high: {
    text: '#FFFFFF',
    ring: '#22C55E',
    ringTrack: 'rgba(34, 197, 94, 0.2)',
    glow: 'rgba(34, 197, 94, 0.42)',
    glowStrong: 'rgba(34, 197, 94, 0.58)',
    backgroundTint: '#22C55E',
    border: '#FFFFFF',
  },
  medium: {
    text: '#FFFFFF',
    ring: '#FF9500',
    ringTrack: 'rgba(255, 149, 0, 0.2)',
    glow: 'rgba(255, 149, 0, 0.42)',
    glowStrong: 'rgba(255, 149, 0, 0.58)',
    backgroundTint: '#FF9500',
    border: '#FFFFFF',
  },
  low: {
    text: '#FFFFFF',
    ring: '#FF2D2D',
    ringTrack: 'rgba(255, 45, 45, 0.2)',
    glow: 'rgba(255, 45, 45, 0.42)',
    glowStrong: 'rgba(255, 45, 45, 0.58)',
    backgroundTint: '#FF2D2D',
    border: '#FFFFFF',
  },
};

export function getAvailabilityStatus(
  percentage: number,
): AvailabilityStatus {
  if (percentage >= 66) {
    return 'high';
  }
  if (percentage >= 33) {
    return 'medium';
  }
  return 'low';
}

export function getAvailabilityTheme(percentage: number): AvailabilityTheme {
  return AVAILABILITY_THEME[getAvailabilityStatus(percentage)];
}
