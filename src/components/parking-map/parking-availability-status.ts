import {
  getParkingAvailabilityLevel,
  type ParkingAvailabilityLevel,
} from '@/utils/parking-availability';

export type AvailabilityStatus = ParkingAvailabilityLevel;

export type AvailabilityTheme = {
  fill: string;
  text: string;
  ring: string;
  ringTrack: string;
  glow: string;
  glowStrong: string;
  backgroundTint: string;
  border: string;
  movingFill: string;
};

export const AVAILABILITY_THEME: Record<
  AvailabilityStatus,
  AvailabilityTheme
> = {
  high: {
    fill: '#22C55E',
    text: '#FFFFFF',
    ring: '#22C55E',
    ringTrack: 'rgba(34, 197, 94, 0.2)',
    glow: 'rgba(34, 197, 94, 0.42)',
    glowStrong: 'rgba(34, 197, 94, 0.58)',
    backgroundTint: '#22C55E',
    border: '#FFFFFF',
    movingFill: '#22C55E',
  },
  medium: {
    fill: '#FF9500',
    text: '#FFFFFF',
    ring: '#FF9500',
    ringTrack: 'rgba(255, 149, 0, 0.2)',
    glow: 'rgba(255, 149, 0, 0.42)',
    glowStrong: 'rgba(255, 149, 0, 0.58)',
    backgroundTint: '#FF9500',
    border: '#FFFFFF',
    movingFill: '#FF9500',
  },
  low: {
    fill: '#FF2D2D',
    text: '#FFFFFF',
    ring: '#FF2D2D',
    ringTrack: 'rgba(255, 45, 45, 0.2)',
    glow: 'rgba(255, 45, 45, 0.42)',
    glowStrong: 'rgba(255, 45, 45, 0.58)',
    backgroundTint: '#FF2D2D',
    border: '#FFFFFF',
    movingFill: '#FF2D2D',
  },
};

export function getAvailabilityStatus(
  percentage: number,
): AvailabilityStatus {
  return getParkingAvailabilityLevel(percentage);
}

export function getAvailabilityTheme(percentage: number): AvailabilityTheme {
  return AVAILABILITY_THEME[getAvailabilityStatus(percentage)];
}
