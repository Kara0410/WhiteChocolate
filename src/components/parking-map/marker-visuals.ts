import type {
  AvailabilityColorStatus,
  ParkingClusterResponse,
} from '@/types/parking-map';

export type MarkerSizeTier = 'large' | 'medium' | 'small' | 'spot';

export const MARKER_PALETTES: Record<
  AvailabilityColorStatus,
  {
    accent: string;
    accentSoft: string;
    glow: string;
    text: string;
  }
> = {
  green: {
    accent: '#32D17C',
    accentSoft: '#75E5A5',
    glow: 'rgba(50,209,124,0.28)',
    text: '#102A20',
  },
  orange: {
    accent: '#FF9F0A',
    accentSoft: '#FFC45C',
    glow: 'rgba(255,159,10,0.27)',
    text: '#382109',
  },
  red: {
    accent: '#FF453A',
    accentSoft: '#FF7A72',
    glow: 'rgba(255,69,58,0.26)',
    text: '#3A1715',
  },
};

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
      ? { width: 148, height: 72 }
      : tier === 'medium'
        ? { width: 124, height: 60 }
        : tier === 'small'
          ? { width: 104, height: 48 }
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
