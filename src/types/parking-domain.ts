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

export type ParkingAvailability =
  | {
      status: 'estimated';
      availableSpaces: number | null;
      totalSpaces: number | null;
      percent: number;
      confidence: 'low' | 'medium';
      generatedAt: string;
      validUntil: string;
      estimatorVersion?: string | null;
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
      estimatorVersion?: null;
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

export type ParkingSegmentSummary = {
  id: string;
  cityCode: string;
  sourceRecordId: string | null;
  streetName: string | null;
  sourceAreaName: string | null;
  sourceClassification: string | null;
  sourceGeometry: string | null;
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

export type ParkingCellResolution = 'coarse' | 'fine';

export type ParkingCellSummary = {
  kind: 'cell-summary';
  id: string;
  center: ParkingCoordinates;
  bounds: ParkingBoundingBox;
  resolution: ParkingCellResolution;
  stats: ParkingAggregateStats;
};

export type ParkingMapFeatureKind =
  | 'cell'
  | 'segment-cluster'
  | 'segment'
  | 'space';

export type ParkingMapFeatureBase = {
  id: string;
  kind: ParkingMapFeatureKind;
  coordinates: ParkingCoordinates;
  stats: ParkingAggregateStats;
};

export type ParkingCellMapFeature = ParkingMapFeatureBase & {
  kind: 'cell';
  cell: ParkingCellSummary;
};

export type ParkingSegmentClusterMapFeature = ParkingMapFeatureBase & {
  kind: 'segment-cluster';
  expansionZoom: number;
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
