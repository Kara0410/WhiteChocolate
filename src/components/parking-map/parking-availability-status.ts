import {
  getParkingAvailabilityLevel,
  type ParkingAvailabilityLevel,
} from '@/utils/parking-availability';
import { COLORS } from '@/constants/theme';

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
    fill: COLORS.status.available,
    text: COLORS.text.onAccent,
    ring: COLORS.status.available,
    ringTrack: COLORS.status.availableTrack,
    glow: COLORS.status.availableGlow,
    glowStrong: COLORS.status.availableGlowStrong,
    backgroundTint: COLORS.status.available,
    border: COLORS.surface.default,
    movingFill: COLORS.status.available,
  },
  medium: {
    fill: COLORS.status.limited,
    text: COLORS.text.onAccent,
    ring: COLORS.status.limited,
    ringTrack: COLORS.status.limitedTrack,
    glow: COLORS.status.limitedGlow,
    glowStrong: COLORS.status.limitedGlowStrong,
    backgroundTint: COLORS.status.limited,
    border: COLORS.surface.default,
    movingFill: COLORS.status.limited,
  },
  low: {
    fill: COLORS.status.full,
    text: COLORS.text.onAccent,
    ring: COLORS.status.full,
    ringTrack: COLORS.status.fullTrack,
    glow: COLORS.status.fullGlow,
    glowStrong: COLORS.status.fullGlowStrong,
    backgroundTint: COLORS.status.full,
    border: COLORS.surface.default,
    movingFill: COLORS.status.full,
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
