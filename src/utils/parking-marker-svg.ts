import type {
  AvailabilityColorStatus,
  ParkingClusterResponse,
} from '@/types/parking-map';

export const AVAILABILITY_PALETTES: Record<
  AvailabilityColorStatus,
  {
    aura: string;
    deep: string;
    surface: string;
  }
> = {
  green: {
    aura: 'rgba(58,167,108,0.24)',
    deep: '#12613D',
    surface: 'rgba(218,244,230,0.94)',
  },
  orange: {
    aura: 'rgba(231,153,63,0.25)',
    deep: '#8A480D',
    surface: 'rgba(255,235,207,0.95)',
  },
  red: {
    aura: 'rgba(218,91,85,0.23)',
    deep: '#8D2F2B',
    surface: 'rgba(255,222,219,0.95)',
  },
};

export function getMarkerDimensions(
  type: ParkingClusterResponse['type'],
  zoom: number,
) {
  if (type === 'spot') {
    const size = zoom >= 18 ? 50 : 46;
    return {
      width: size + 8,
      height: size + 8,
      markerWidth: size,
      markerHeight: size,
    };
  }

  const markerWidth = zoom <= 10 ? 106 : zoom <= 13 ? 100 : 94;
  const markerHeight = zoom <= 10 ? 78 : zoom <= 13 ? 74 : 70;
  return {
    width: markerWidth + 10,
    height: markerHeight + 10,
    markerWidth,
    markerHeight,
  };
}

export function displayZoneCount(zoneCount: number) {
  if (zoneCount <= 10) {
    return zoneCount;
  }
  if (zoneCount <= 50) {
    return Math.round(zoneCount / 5) * 5;
  }
  return Math.round(zoneCount / 10) * 10;
}

type MarkerSvgInput = Pick<
  ParkingClusterResponse,
  | 'availabilityPercent'
  | 'availableSpots'
  | 'colorStatus'
  | 'minPrice'
  | 'totalCapacity'
  | 'type'
> & {
  zoneCount: number;
  zoom: number;
};

export function createParkingMarkerSvg(input: MarkerSvgInput) {
  const palette = AVAILABILITY_PALETTES[input.colorStatus];
  const dimensions = getMarkerDimensions(input.type, input.zoom);
  const radius =
    input.type === 'spot'
      ? dimensions.markerWidth / 2
      : Math.min(28, dimensions.markerHeight / 2);
  const centerX = dimensions.width / 2;
  const percentageY =
    input.type === 'spot'
      ? dimensions.height / 2 + 5
      : 5 + dimensions.markerHeight / 2;
  const zoneCount = displayZoneCount(input.zoneCount);
  const zoneLabel = `${zoneCount} ${zoneCount === 1 ? 'zone' : 'zones'}`;
  const priceLabel =
    input.minPrice === null ? 'Free' : `From €${input.minPrice.toFixed(2)}`;

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${dimensions.width}" height="${dimensions.height}" viewBox="0 0 ${dimensions.width} ${dimensions.height}">
      <rect width="${dimensions.width}" height="${dimensions.height}" rx="${radius + 5}" fill="${palette.aura}"/>
      <rect x="5" y="5" width="${dimensions.markerWidth}" height="${dimensions.markerHeight}" rx="${radius}" fill="${palette.surface}" stroke="rgba(255,255,255,0.96)" stroke-width="1"/>
      <text x="${centerX}" y="${percentageY}" text-anchor="middle" fill="${palette.deep}" font-family="Arial, sans-serif" font-size="${input.type === 'spot' ? 15 : 18}" font-weight="800">${input.type === 'spot' ? `${input.availabilityPercent}%` : `${input.totalCapacity} spaces`}</text>
      ${
        input.type === 'cluster'
          ? `<text x="${centerX}" y="${percentageY + 14}" text-anchor="middle" fill="${palette.deep}" fill-opacity="0.82" font-family="Arial, sans-serif" font-size="10" font-weight="700">${input.availableSpots} free · ${priceLabel}</text>
             <text x="${centerX}" y="${percentageY + 26}" text-anchor="middle" fill="${palette.deep}" fill-opacity="0.62" font-family="Arial, sans-serif" font-size="8" font-weight="600">${zoneLabel}</text>`
          : ''
      }
    </svg>
  `.trim();
}
