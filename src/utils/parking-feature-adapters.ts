import type {
  ParkingCellSummary,
  ParkingMapFeature,
  ParkingSegmentSummary,
} from '@/types/parking-domain';
import type { ParkingClusterResponse } from '@/types/parking-map';

export function cellSummaryToMapFeature(
  cell: ParkingCellSummary,
): ParkingMapFeature {
  return {
    id: `cell:${cell.id}`,
    kind: 'cell',
    coordinates: cell.center,
    stats: cell.stats,
    cell,
  };
}

function segmentTitle(segment: ParkingSegmentSummary) {
  return (
    segment.streetName ??
    segment.sourceAreaName ??
    'Unnamed parking segment'
  );
}

/** Projects a segment map feature into the marker and sheet response shape. */
export function parkingMapFeatureToResponse(
  feature: ParkingMapFeature,
): ParkingClusterResponse | null {
  if (feature.kind !== 'segment' && feature.kind !== 'segment-cluster') {
    return null;
  }
  const percentage = feature.stats.availabilityPercent;
  const isCluster = feature.kind === 'segment-cluster';
  const segment = feature.kind === 'segment' ? feature.segment : null;
  const title = segment ? segmentTitle(segment) : 'Parking areas';
  const minimumRate = feature.stats.pricing.minimumHourlyRate;

  return {
    id: feature.id,
    type: isCluster ? 'cluster' : 'spot',
    latitude: feature.coordinates.latitude,
    longitude: feature.coordinates.longitude,
    availabilityPercent: percentage,
    availabilityStatus: feature.stats.availabilityStatus,
    availabilityConfidence:
      segment?.availability.status === 'estimated'
        ? segment.availability.confidence
        : null,
    estimateGeneratedAt:
      segment?.availability.status === 'estimated'
        ? segment.availability.generatedAt
        : feature.stats.newestEstimateGeneratedAt ?? null,
    estimateValidUntil:
      segment?.availability.status === 'estimated'
        ? segment.availability.validUntil
        : null,
    estimatorVersion:
      segment?.availability.status === 'estimated'
        ? segment.availability.estimatorVersion ?? null
        : null,
    count: feature.stats.segmentCount,
    spotCount: feature.stats.segmentCount,
    totalCapacity: feature.stats.totalCapacity ?? 0,
    availableSpots: feature.stats.availableCapacity,
    colorStatus:
      feature.stats.availabilityPercent === null
        ? 'neutral'
        : feature.stats.availabilityPercent >= 60
          ? 'green'
          : feature.stats.availabilityPercent >= 30
            ? 'orange'
            : 'red',
    minPrice: minimumRate,
    avgPrice: minimumRate,
    pricingStatus: feature.stats.pricing.hasFreeParking
      ? 'free'
      : minimumRate !== null
        ? 'paid'
        : 'unknown',
    bestSpot: {
      id: segment?.id ?? feature.id,
      label: title,
      availableSpots: feature.stats.availableCapacity,
      availabilityPercent: percentage,
      pricePerHour: minimumRate,
    },
    expansionZoom:
      feature.kind === 'segment-cluster' ? feature.expansionZoom : undefined,
  };
}
