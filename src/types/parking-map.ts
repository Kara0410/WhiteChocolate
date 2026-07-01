export type AvailabilityColorStatus = 'green' | 'orange' | 'red';

export type ParkingItemType = 'zone' | 'spot';

export type ParkingCoordinates = {
  latitude: number;
  longitude: number;
};

export type WalkingCategory = 'close' | 'acceptable' | 'far';

export type ParkingBestSpot = {
  id: string;
  zoneName: string;
  availableSpots: number;
  availabilityPercent: number;
  pricePerHour: number | null;
};

export type ParkingClusterResponse = {
  id: string;
  type: 'cluster' | 'spot';
  latitude: number;
  longitude: number;
  availabilityPercent: number;
  count: number;
  zoneCount?: number;
  spotCount?: number;
  totalCapacity: number;
  availableSpots: number;
  colorStatus: AvailabilityColorStatus;
  minPrice: number | null;
  avgPrice: number | null;
  bestSpot: ParkingBestSpot;
  expansionZoom?: number;
  distanceToDestination?: number;
  walkingCategory?: WalkingCategory;
};

export type ParkingMapRecord = {
  id: string;
  latitude: number;
  longitude: number;
  zoneId: string;
  zoneName: string;
  capacity: number;
  available: number;
  availabilityPercent: number;
  updatedAt: string;
  pricePerHour: number | null;
  maxStay: number | null;
  restrictions: string;
  type: ParkingItemType;
};

export type ParkingBoundingBox = {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
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
