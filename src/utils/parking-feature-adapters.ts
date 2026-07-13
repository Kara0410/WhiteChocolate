import type {
  ParkingCellSummary,
  ParkingMapFeature,
  ParkingSegmentSummary,
  ParkingZoneSummary,
} from '@/types/parking-domain';
import type { ParkingClusterResponse } from '@/types/parking-map';

export function zoneSummaryToMapFeature(
  summary: ParkingZoneSummary,
): ParkingMapFeature {
  return {
    id: `zone:${summary.zoneId}`,
    kind: 'zone',
    coordinates: summary.representativePoint,
    stats: summary.stats,
    parentId: null,
    zoneId: summary.zoneId,
    zoneName: summary.zoneName,
  };
}

export function cellSummaryToMapFeature(
  cell: ParkingCellSummary,
): ParkingMapFeature {
  return {
    id: `cell:${cell.id}`,
    kind: 'cell',
    coordinates: cell.center,
    stats: cell.stats,
    parentId: cell.parentZoneIds[0] ?? null,
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

/** Compatibility adapter for sheets that have not yet moved off the legacy shape. */
export function parkingMapFeatureToLegacyResponse(
  feature: ParkingMapFeature,
): ParkingClusterResponse | null {
  if (feature.kind !== 'segment' && feature.kind !== 'segment-cluster') {
    return null;
  }
  const percentage = feature.stats.availabilityPercent ?? 0;
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
    count: feature.stats.segmentCount,
    zoneCount: feature.parentId === null ? 0 : 1,
    spotCount: feature.stats.segmentCount,
    totalCapacity: feature.stats.totalCapacity ?? 0,
    availableSpots: feature.stats.availableCapacity ?? 0,
    colorStatus:
      feature.stats.availabilityPercent === null
        ? 'orange'
        : percentage >= 60
          ? 'green'
          : percentage >= 30
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
      zoneName: title,
      availableSpots: feature.stats.availableCapacity ?? 0,
      availabilityPercent: percentage,
      pricePerHour: minimumRate,
    },
    zoneId: segment?.zoneId ?? feature.parentId,
    zoneName: segment?.sourceAreaName ?? null,
    expansionZoom:
      feature.kind === 'segment-cluster' ? feature.expansionZoom : undefined,
  };
}
