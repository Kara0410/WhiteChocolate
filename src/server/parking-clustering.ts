import type {
  ParkingBoundingBox,
  ParkingClusterResponse,
  ParkingMapRecord,
} from '@/types/parking-map';
import {
  bboxContains,
  getAvailabilityColorStatus,
  latitudeToTileY,
  longitudeToTileX,
} from '@/utils/parking-map-geo';

const MAX_VISIBLE_MARKERS = 96;

type ClusterAccumulator = {
  id: string;
  weightedLatitude: number;
  weightedLongitude: number;
  coordinateWeight: number;
  totalCapacity: number;
  availableSpots: number;
  spotCount: number;
  zoneIds: Set<string>;
};

function initialGridZoom(zoom: number) {
  if (zoom <= 11) {
    return Math.max(6, zoom - 3);
  }
  if (zoom <= 14) {
    return zoom - 2;
  }
  return zoom - 2;
}

function toSpot(record: ParkingMapRecord): ParkingClusterResponse {
  return {
    id: `spot:${record.id}`,
    type: 'spot',
    latitude: record.latitude,
    longitude: record.longitude,
    availabilityPercent: record.availabilityPercent,
    totalCapacity: record.capacity,
    availableSpots: record.available,
    colorStatus: getAvailabilityColorStatus(record.availabilityPercent),
    spotCount: 1,
    zoneCount: 1,
  };
}

function clusterAtGridZoom(
  records: ParkingMapRecord[],
  gridZoom: number,
): ParkingClusterResponse[] {
  const accumulators = new Map<string, ClusterAccumulator>();

  for (const record of records) {
    const cellX = Math.floor(longitudeToTileX(record.longitude, gridZoom));
    const cellY = Math.floor(latitudeToTileY(record.latitude, gridZoom));
    const id = `cluster:z${gridZoom}:x${cellX}:y${cellY}`;
    const weight = Math.max(1, record.capacity);
    const accumulator = accumulators.get(id) ?? {
      id,
      weightedLatitude: 0,
      weightedLongitude: 0,
      coordinateWeight: 0,
      totalCapacity: 0,
      availableSpots: 0,
      spotCount: 0,
      zoneIds: new Set<string>(),
    };

    accumulator.weightedLatitude += record.latitude * weight;
    accumulator.weightedLongitude += record.longitude * weight;
    accumulator.coordinateWeight += weight;
    accumulator.totalCapacity += record.capacity;
    accumulator.availableSpots += record.available;
    accumulator.spotCount += 1;
    accumulator.zoneIds.add(record.zoneId);
    accumulators.set(id, accumulator);
  }

  return [...accumulators.values()].map((cluster) => {
    const availabilityPercent =
      cluster.totalCapacity === 0
        ? 0
        : Math.round((cluster.availableSpots / cluster.totalCapacity) * 100);

    return {
      id: cluster.id,
      type: 'cluster',
      latitude: cluster.weightedLatitude / cluster.coordinateWeight,
      longitude: cluster.weightedLongitude / cluster.coordinateWeight,
      availabilityPercent,
      zoneCount: cluster.zoneIds.size,
      spotCount: cluster.spotCount,
      totalCapacity: cluster.totalCapacity,
      availableSpots: cluster.availableSpots,
      colorStatus: getAvailabilityColorStatus(availabilityPercent),
    };
  });
}

export function clusterParkingRecords(
  records: ParkingMapRecord[],
  bbox: ParkingBoundingBox,
  zoom: number,
) {
  const visibleRecords = records.filter((record) =>
    bboxContains(bbox, record.latitude, record.longitude),
  );

  if (zoom >= 17 && visibleRecords.length <= MAX_VISIBLE_MARKERS) {
    return visibleRecords.map(toSpot);
  }

  let gridZoom = zoom >= 17 ? 15 : initialGridZoom(zoom);
  let clusters = clusterAtGridZoom(visibleRecords, gridZoom);

  while (clusters.length > MAX_VISIBLE_MARKERS && gridZoom > 5) {
    gridZoom -= 1;
    clusters = clusterAtGridZoom(visibleRecords, gridZoom);
  }

  return clusters;
}
