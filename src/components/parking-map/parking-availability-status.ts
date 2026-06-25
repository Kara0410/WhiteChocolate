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
    text: '#168A35',
    ring: '#34C759',
    ringTrack: 'rgba(52, 199, 89, 0.18)',
    glow: 'rgba(52, 199, 89, 0.55)',
    glowStrong: 'rgba(52, 199, 89, 0.70)',
    backgroundTint: 'rgba(232, 255, 239, 0.78)',
    border: 'rgba(112, 220, 142, 0.28)',
  },
  medium: {
    text: '#D46A00',
    ring: '#FF8A00',
    ringTrack: 'rgba(255, 138, 0, 0.18)',
    glow: 'rgba(255, 138, 0, 0.55)',
    glowStrong: 'rgba(255, 138, 0, 0.70)',
    backgroundTint: 'rgba(255, 246, 232, 0.78)',
    border: 'rgba(255, 170, 64, 0.3)',
  },
  low: {
    text: '#D91F26',
    ring: '#FF3B30',
    ringTrack: 'rgba(255, 59, 48, 0.18)',
    glow: 'rgba(255, 59, 48, 0.55)',
    glowStrong: 'rgba(255, 59, 48, 0.70)',
    backgroundTint: 'rgba(255, 236, 236, 0.78)',
    border: 'rgba(255, 105, 97, 0.3)',
  },
};

export function getAvailabilityStatus(
  percentage: number,
): AvailabilityStatus {
  if (percentage >= 65) {
    return 'high';
  }
  if (percentage >= 30) {
    return 'medium';
  }
  return 'low';
}

export function getAvailabilityTheme(percentage: number): AvailabilityTheme {
  return AVAILABILITY_THEME[getAvailabilityStatus(percentage)];
}
