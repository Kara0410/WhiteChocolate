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
      ? { width: 70, height: 44, visualSize: 62 }
      : tier === 'medium'
        ? { width: 62, height: 42, visualSize: 54 }
        : tier === 'small'
          ? { width: 54, height: 40, visualSize: 46 }
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
