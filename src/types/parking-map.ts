import type {
  ParkingBoundingBox,
  ParkingCoordinates,
} from '@/types/parking-domain';

export type AvailabilityColorStatus = 'green' | 'orange' | 'red';

export type WalkingCategory = 'close' | 'acceptable' | 'far';

export type ParkingBestSpot = {
  id: string;
  zoneName: string;
  availableSpots: number;
  availabilityPercent: number;
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
  availabilityPercent: number;
  availabilityStatus?:
    | 'live'
    | 'predicted'
    | 'estimated'
    | 'unknown'
    | 'mixed';
  count: number;
  zoneCount?: number;
  spotCount?: number;
  totalCapacity: number;
  availableSpots: number;
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
