export type ParkingCoordinates = {
  latitude: number;
  longitude: number;
};

export type ParkingBoundingBox = {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
};

export type GeoJsonPolygon = {
  type: 'Polygon';
  coordinates: number[][][];
};

export type GeoJsonMultiPolygon = {
  type: 'MultiPolygon';
  coordinates: number[][][][];
};

export type ParkingAvailability =
  | {
      status: 'estimated';
      availableSpaces: number;
      totalSpaces: number;
      percent: number;
      confidence: 'low' | 'medium';
      generatedAt: string;
      validUntil: string;
      factors: ParkingEstimateFactor[];
    }
  | {
      status: 'unknown';
      availableSpaces: null;
      totalSpaces: number | null;
      percent: null;
      confidence: null;
      generatedAt: null;
      validUntil: null;
      factors: ParkingEstimateFactor[];
    };

export type ParkingEstimateFactor = {
  code: string;
  impact: 'increases-demand' | 'reduces-demand' | 'neutral';
  weight: number;
};

export type ParkingEstimateDestination = ParkingCoordinates & {
  placeId: string | null;
};

export type ParkingPricing =
  | { status: 'free'; currency: 'EUR' }
  | {
      status: 'paid';
      currency: 'EUR';
      hourlyRate: number | null;
      dailyRate: number | null;
    }
  | { status: 'unknown'; currency: 'EUR' };

export type ParkingRegulation = {
  description: string | null;
  groupName: string | null;
  name: string | null;
  maximumStayMinutes: number | null;
};

export type ParkingAggregateStats = {
  segmentCount: number;
  totalCapacity: number | null;
  availableCapacity: number | null;
  availabilityPercent: number | null;
  pricing: {
    minimumHourlyRate: number | null;
    maximumHourlyRate: number | null;
    hasFreeParking: boolean;
    hasUnknownPricing: boolean;
  };
  availabilityStatus: ParkingAvailability['status'] | 'mixed';
  estimatedSegmentCount?: number;
  unknownSegmentCount?: number;
  estimateCoverageRatio?: number;
  oldestEstimateGeneratedAt?: string | null;
  newestEstimateGeneratedAt?: string | null;
  updatedAt: string | null;
};

export type ParkingAdministrativeZoneStatus =
  | 'active'
  | 'planned'
  | 'inactive'
  | 'unknown';

export type ParkingAdministrativeZone = {
  id: string;
  name: string;
  status: ParkingAdministrativeZoneStatus;
  geometry: GeoJsonPolygon | GeoJsonMultiPolygon;
  representativePoint: ParkingCoordinates;
  updatedAt: string | null;
};

export type ParkingSegmentSummary = {
  id: string;
  zoneId: string | null;
  streetName: string | null;
  sourceAreaName: string | null;
  coordinates: ParkingCoordinates;
  capacity: number | null;
  pricing: ParkingPricing;
  availability: ParkingAvailability;
  updatedAt: string | null;
};

export type ParkingSpace = {
  id: string;
  segmentId: string;
  coordinates: ParkingCoordinates;
  availability: ParkingAvailability;
  updatedAt: string | null;
};

export type ParkingZoneSummary = {
  kind: 'zone-summary';
  zoneId: string;
  zoneName: string;
  representativePoint: ParkingCoordinates;
  stats: ParkingAggregateStats;
};

export type ParkingCellResolution = 'coarse' | 'fine';

export type ParkingCellSummary = {
  kind: 'cell-summary';
  id: string;
  parentZoneIds: string[];
  center: ParkingCoordinates;
  bounds: ParkingBoundingBox;
  resolution: ParkingCellResolution;
  stats: ParkingAggregateStats;
};

export type ParkingMapFeatureKind =
  | 'zone'
  | 'cell'
  | 'segment-cluster'
  | 'segment'
  | 'space';

export type ParkingMapFeatureBase = {
  id: string;
  kind: ParkingMapFeatureKind;
  coordinates: ParkingCoordinates;
  stats: ParkingAggregateStats;
  parentId: string | null;
};

export type ParkingZoneMapFeature = ParkingMapFeatureBase & {
  kind: 'zone';
  zoneId: string;
  zoneName: string;
};

export type ParkingCellMapFeature = ParkingMapFeatureBase & {
  kind: 'cell';
  cell: ParkingCellSummary;
};

export type ParkingSegmentClusterMapFeature = ParkingMapFeatureBase & {
  kind: 'segment-cluster';
  expansionZoom: number;
  zoneId: string | null;
};

export type ParkingSegmentMapFeature = ParkingMapFeatureBase & {
  kind: 'segment';
  segment: ParkingSegmentSummary;
};

export type ParkingSpaceMapFeature = ParkingMapFeatureBase & {
  kind: 'space';
  space: ParkingSpace;
};

export type ParkingMapFeature =
  | ParkingZoneMapFeature
  | ParkingCellMapFeature
  | ParkingSegmentClusterMapFeature
  | ParkingSegmentMapFeature
  | ParkingSpaceMapFeature;

export type ParkingSearchResult = {
  segmentId: string;
  title: string;
  coordinates: ParkingCoordinates;
  distanceMeters: number;
  stats: ParkingAggregateStats;
};

export type ParkingNavigationTarget = {
  id: string;
  label: string;
  coordinates: ParkingCoordinates;
  entityType: 'segment' | 'facility' | 'space';
};

export type FavoriteParkingReference = {
  entityId: string;
  entityType: 'segment' | 'facility';
  createdAt: string;
};

export const EMPTY_PARKING_AGGREGATE_STATS: ParkingAggregateStats = {
  segmentCount: 0,
  totalCapacity: null,
  availableCapacity: null,
  availabilityPercent: null,
  pricing: {
    minimumHourlyRate: null,
    maximumHourlyRate: null,
    hasFreeParking: false,
    hasUnknownPricing: false,
  },
  availabilityStatus: 'unknown',
  updatedAt: null,
};
