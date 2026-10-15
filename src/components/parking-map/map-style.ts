import { COLORS } from '@/constants/theme';

/**
 * Provider-authored colors are not present in the SVG because its map is an
 * embedded raster. These documented extensions reproduce the reference's
 * light land, quiet roads, pale parks, cyan water, and low-contrast labels.
 */
export const WHITE_CHOCOLATE_GOOGLE_MAP_STYLE = JSON.stringify([
  {
    elementType: 'geometry',
    stylers: [{ color: COLORS.map.land }],
  },
  {
    elementType: 'labels.icon',
    stylers: [{ visibility: 'off' }],
  },
  {
    elementType: 'labels.text.fill',
    stylers: [{ color: COLORS.map.label }],
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: COLORS.map.road }, { weight: 1.5 }],
  },
  {
    featureType: 'administrative.land_parcel',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: COLORS.map.park }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: COLORS.map.road }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: COLORS.map.roadOutline }],
  },
  {
    featureType: 'road.arterial',
    elementType: 'geometry',
    stylers: [{ color: COLORS.map.majorRoad }],
  },
  {
    featureType: 'road.local',
    elementType: 'labels',
    stylers: [{ visibility: 'simplified' }],
  },
  {
    featureType: 'transit',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: COLORS.map.water }],
  },
]);
