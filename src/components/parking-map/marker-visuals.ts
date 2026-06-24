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

export function getMarkerDimensions(
  tier: MarkerSizeTier,
  selected = false,
) {
  const visualSize =
    tier === 'large'
      ? 416
      : tier === 'medium'
        ? 360
        : tier === 'small'
          ? 312
          : 256;
  const scaledVisualSize = Math.round(visualSize * (selected ? 1.08 : 1));
  const glowPadding = tier === 'spot' ? 40 : selected ? 68 : 56;
  return {
    canvasSize: scaledVisualSize + glowPadding * 2,
    visualSize: scaledVisualSize,
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

export function displayAvailabilityPercent(availabilityPercent: number) {
  return Math.max(0, Math.min(100, Math.round(availabilityPercent / 2) * 2));
}

export function zoneCountLabel(zoneCount: number) {
  const displayed = displayZoneCount(zoneCount);
  const suffix = zoneCount > displayed ? '+' : '';
  return `${displayed}${suffix} ${displayed === 1 ? 'zone' : 'zones'}`;
}

export function markerImageKey(
  item: Pick<
    ParkingClusterResponse,
    'availabilityPercent' | 'colorStatus' | 'type' | 'zoneCount'
  >,
  zoom: number,
  selected = false,
) {
  const tier = getMarkerSizeTier(item.type, zoom);
  const percentage = displayAvailabilityPercent(item.availabilityPercent);
  const zones =
    item.type === 'cluster' ? displayZoneCount(item.zoneCount ?? 0) : 0;
  return [
    'parking-marker-v4',
    item.type,
    tier,
    item.colorStatus,
    percentage,
    zones,
    selected ? 'selected' : 'default',
  ].join(':');
}
