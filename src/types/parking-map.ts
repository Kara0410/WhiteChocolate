import type {
  ParkingBoundingBox,
  ParkingCoordinates,
} from '@/types/parking-domain';

export type AvailabilityColorStatus = 'green' | 'orange' | 'red' | 'neutral';

export type WalkingCategory = 'close' | 'acceptable' | 'far';

export type ParkingBestSpot = {
  id: string;
  zoneName: string;
  availableSpots: number | null;
  availabilityPercent: number | null;
  pricePerHour: number | null;
};

/**
 * @deprecated Compatibility projection for legacy sheets and lists. New map
 * fetching and rendering use ParkingMapFeature discriminants instead.
 */
export type ParkingClusterResponse = {
  id: string;
  type: 'cluster' | 'spot';
  latitude: number;
  longitude: number;
  availabilityPercent: number | null;
  availabilityStatus?: 'estimated' | 'unknown' | 'mixed';
  availabilityConfidence?: 'low' | 'medium' | null;
  estimateGeneratedAt?: string | null;
  estimateValidUntil?: string | null;
  count: number;
  zoneCount?: number;
  spotCount?: number;
  totalCapacity: number;
  availableSpots: number | null;
  colorStatus: AvailabilityColorStatus;
  minPrice: number | null;
  avgPrice: number | null;
  pricingStatus?: 'free' | 'paid' | 'unknown';
  bestSpot: ParkingBestSpot;
  zoneId?: string | null;
  zoneName?: string | null;
  expansionZoom?: number;
  distanceToDestination?: number;
  walkingCategory?: WalkingCategory;
};

export type ParkingCameraState = {
  latitude: number;
  longitude: number;
  zoom: number;
  latitudeDelta?: number;
  longitudeDelta?: number;
};

export type ParkingMapSize = {
  width: number;
  height: number;
};

export type ParkingClusterRequest = {
  bbox: ParkingBoundingBox;
  zoom: number;
  tileKey: string;
  destination?: ParkingCoordinates;
};
export type {
  ParkingBoundingBox,
  ParkingCoordinates,
} from '@/types/parking-domain';
