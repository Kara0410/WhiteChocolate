import type { ParkingClusterResponse } from '@/types/parking-map';

export type MarkerSizeTier = 'large' | 'medium' | 'small' | 'spot';

export function getMarkerSizeTier(
  type: ParkingClusterResponse['type'],
  zoom: number,
): MarkerSizeTier {
  if (type === 'spot') {
    return 'spot';
  }
  if (zoom <= 10) {
    return 'large';
  }
  if (zoom <= 13) {
    return 'medium';
  }
  return 'small';
}

export function getMarkerDimensions(tier: MarkerSizeTier) {
  const base =
    tier === 'large'
      ? { width: 96, height: 44, visualSize: 88 }
      : tier === 'medium'
        ? { width: 90, height: 42, visualSize: 82 }
        : tier === 'small'
          ? { width: 84, height: 40, visualSize: 76 }
          : { width: 78, height: 50, visualSize: 68 };
  const width = base.width;
  const height = base.height;
  const glowPadding = 4;
  return {
    canvasSize: Math.max(width, height) + glowPadding * 2,
    visualSize: base.visualSize,
    width,
    height,
    glowPadding,
  };
}

export type FormatSpotCountOptions = {
  /** Cap large values, e.g. 73 -> "50+ Spots" for zone summaries. */
  capped?: boolean;
  /** Cap threshold used when capped is true. Defaults to 50. */
  cap?: number;
};

export function formatSpotCount(
  count: number,
  options?: FormatSpotCountOptions,
) {
  const normalizedCount = Number.isFinite(count)
    ? Math.max(0, Math.round(count))
    : 0;

  if (options?.capped) {
    const cap = options.cap ?? 50;
    if (normalizedCount >= cap) {
      return `${cap}+ Spots`;
    }
  }

  const displayedCount =
    normalizedCount > 999 ? '999+' : String(normalizedCount);

  return `${displayedCount} ${normalizedCount === 1 ? 'Spot' : 'Spots'}`;
}

export function displayZoneCount(zoneCount: number) {
  if (zoneCount <= 20) {
    return zoneCount;
  }
  if (zoneCount <= 100) {
    return Math.round(zoneCount / 5) * 5;
  }
  return Math.round(zoneCount / 25) * 25;
}

export function zoneCountLabel(zoneCount: number) {
  const displayed = displayZoneCount(zoneCount);
  const suffix = zoneCount > displayed ? '+' : '';
  return `${displayed}${suffix} ${displayed === 1 ? 'zone' : 'zones'}`;
}
