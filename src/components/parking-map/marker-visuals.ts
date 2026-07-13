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
      ? { width: 132, height: 52, visualSize: 86 }
      : tier === 'medium'
        ? { width: 124, height: 50, visualSize: 80 }
        : tier === 'small'
          ? { width: 116, height: 48, visualSize: 74 }
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

export function formatParkingAreaCount(count: number) {
  const normalized = Number.isFinite(count)
    ? Math.max(0, Math.round(count))
    : 0;
  return `${normalized > 999 ? '999+' : normalized} ${
    normalized === 1 ? 'area' : 'areas'
  }`;
}
