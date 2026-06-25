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
      ? { width: 164, height: 78 }
      : tier === 'medium'
        ? { width: 136, height: 64 }
        : tier === 'small'
          ? { width: 108, height: 52 }
          : { width: 72, height: 72 };
  const width = base.width;
  const height = base.height;
  const glowPadding = tier === 'spot' ? 10 : 14;
  return {
    canvasSize: Math.max(width, height) + glowPadding * 2,
    visualSize: width,
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
