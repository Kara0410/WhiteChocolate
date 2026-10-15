import type { AvailabilityColorStatus } from '@/types/parking-map';

// 66/33 — not derived from Searching.svg (which only supplies example colors/percentages,
// not cutoffs). This is the pre-existing canonical threshold; kept as the single source every
// bubble, card, and the street-availability overlay reads, instead of introducing another cutoff.
export const PARKING_AVAILABILITY_THRESHOLDS = {
  high: 66,
  medium: 33,
} as const;

export type ParkingAvailabilityLevel = 'high' | 'medium' | 'low';

export function normalizeAvailabilityPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

export function getParkingAvailabilityLevel(
  percentage: number,
): ParkingAvailabilityLevel {
  const normalized = normalizeAvailabilityPercent(percentage);

  if (normalized >= PARKING_AVAILABILITY_THRESHOLDS.high) {
    return 'high';
  }

  if (normalized >= PARKING_AVAILABILITY_THRESHOLDS.medium) {
    return 'medium';
  }

  return 'low';
}

export function getAvailabilityColorStatus(
  percentage: number,
): AvailabilityColorStatus {
  const level = getParkingAvailabilityLevel(percentage);

  if (level === 'high') {
    return 'green';
  }

  if (level === 'medium') {
    return 'orange';
  }

  return 'red';
}
