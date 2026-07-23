import type {
  ParkingBoundingBox,
  ParkingCoordinates,
} from '@/types/parking-domain';

export type AvailabilityColorStatus = 'green' | 'orange' | 'red' | 'neutral';

export type WalkingCategory = 'close' | 'acceptable' | 'far';

export type ParkingBestSpot = {
  id: string;
  label: string;
  availableSpots: number | null;
  availabilityPercent: number | null;
  pricePerHour: number | null;
};

/** Marker, list, and sheet projection for a parking segment or segment cluster. */
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
  estimatorVersion?: string | null;
  count: number;
  spotCount?: number;
  totalCapacity: number;
  availableSpots: number | null;
  colorStatus: AvailabilityColorStatus;
  minPrice: number | null;
  avgPrice: number | null;
  pricingStatus?: 'free' | 'paid' | 'unknown';
  bestSpot: ParkingBestSpot;
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
