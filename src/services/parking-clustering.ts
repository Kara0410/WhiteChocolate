import Supercluster from 'supercluster';

import type {
  ParkingBestSpot,
  ParkingBoundingBox,
  ParkingClusterResponse,
  ParkingCoordinates,
  ParkingMapRecord,
} from '@/types/parking-map';
import {
  getAvailabilityColorStatus,
  getWalkingCategory,
  haversineDistanceMeters,
} from '@/utils/parking-map-geo';

const MAX_CLUSTER_ZOOM = 18;
const MAX_VISIBLE_MARKERS = 120;

type RadiusBucket = 20 | 40 | 60 | 80 | 100 | 120 | 160 | 200;
const RADIUS_BUCKETS: RadiusBucket[] = [20, 40, 60, 80, 100, 120, 160, 200];

type ParkingPointProperties = {
  record: ParkingMapRecord;
};

type ParkingClusterProperties = {
  totalCapacity: number;
  availableSpots: number;
  priceSum: number;
  pricedCount: number;
  minPrice: number | null;
  weightedLatitude: number;
  weightedLongitude: number;
  coordinateWeight: number;
  zoneIds: string[];
  bestSpot: ParkingBestSpot;
};

/**
 * Supercluster measures radius in screen pixels. Combined with Web Mercator
 * zoom, these buckets approximate how people make parking decisions:
 * - <= 10: broad city scanning
 * - 11-13: driving areas (roughly a few kilometres across)
 * - 14-15: walking-relevance areas (roughly 416-624 m across at Munich)
 * - >= 16: tiny clusters that quickly resolve into individual records
 */
export function getClusterRadiusForZoom(zoom: number): RadiusBucket {
  if (zoom <= 10) {
    return 80;
  }
  if (zoom <= 13) {
    return 60;
  }
  if (zoom <= 15) {
    return 40;
  }
  return 20;
}

function toBestSpot(record: ParkingMapRecord): ParkingBestSpot {
  return {
    id: record.id,
    zoneName: record.zoneName,
    availableSpots: record.available,
    availabilityPercent: record.availabilityPercent,
    pricePerHour: record.pricePerHour,
  };
}

function bestSpotScore(spot: ParkingBestSpot) {
  const availabilityPenalty = spot.availableSpots > 0 ? 0 : 1_000_000;
  const price = spot.pricePerHour ?? 999;
  return availabilityPenalty + price * 1_000 - spot.availabilityPercent;
}

function selectBestSpot(
  first: ParkingBestSpot,
  second: ParkingBestSpot,
) {
  return bestSpotScore(first) <= bestSpotScore(second) ? first : second;
}

function pointFeature(record: ParkingMapRecord) {
  return {
    type: 'Feature' as const,
    geometry: {
      type: 'Point' as const,
      coordinates: [record.longitude, record.latitude] as [number, number],
    },
    properties: { record },
  };
}

function createIndex(records: ParkingMapRecord[], radius: RadiusBucket) {
  return new Supercluster<ParkingPointProperties, ParkingClusterProperties>({
    minZoom: 0,
    maxZoom: MAX_CLUSTER_ZOOM,
    radius,
    extent: 512,
    nodeSize: 64,
    minPoints: 2,
    map: ({ record }) => {
      const coordinateWeight = Math.max(1, record.capacity);
      const hasPrice = record.pricePerHour !== null;
      return {
        totalCapacity: record.capacity,
        availableSpots: record.available,
        priceSum: hasPrice ? record.pricePerHour! : 0,
        pricedCount: hasPrice ? 1 : 0,
        minPrice: record.pricePerHour,
        weightedLatitude: record.latitude * coordinateWeight,
        weightedLongitude: record.longitude * coordinateWeight,
        coordinateWeight,
        zoneIds: [record.zoneId],
        bestSpot: toBestSpot(record),
      };
    },
    reduce: (accumulated, next) => {
      accumulated.totalCapacity += next.totalCapacity;
      accumulated.availableSpots += next.availableSpots;
      accumulated.priceSum += next.priceSum;
      accumulated.pricedCount += next.pricedCount;
      accumulated.minPrice =
        accumulated.minPrice === null
          ? next.minPrice
          : next.minPrice === null
            ? accumulated.minPrice
            : Math.min(accumulated.minPrice, next.minPrice);
      accumulated.weightedLatitude += next.weightedLatitude;
      accumulated.weightedLongitude += next.weightedLongitude;
      accumulated.coordinateWeight += next.coordinateWeight;
      accumulated.zoneIds = [
        ...new Set([...accumulated.zoneIds, ...next.zoneIds]),
      ];
      accumulated.bestSpot = selectBestSpot(
        accumulated.bestSpot,
        next.bestSpot,
      );
    },
  }).load(records.map(pointFeature));
}

function destinationMetadata(
  latitude: number,
  longitude: number,
  destination?: ParkingCoordinates,
) {
  if (!destination) {
    return {};
  }

  const distanceToDestination = Math.round(
    haversineDistanceMeters({ latitude, longitude }, destination),
  );
  return {
    distanceToDestination,
    walkingCategory: getWalkingCategory(distanceToDestination),
  };
}

function recordToResponse(
  record: ParkingMapRecord,
  destination?: ParkingCoordinates,
): ParkingClusterResponse {
  return {
    id: `spot:${record.id}`,
    type: 'spot',
    latitude: record.latitude,
    longitude: record.longitude,
    availabilityPercent: record.availabilityPercent,
    count: 1,
    zoneCount: 1,
    spotCount: 1,
    totalCapacity: record.capacity,
    availableSpots: record.available,
    colorStatus: getAvailabilityColorStatus(record.availabilityPercent),
    minPrice: record.pricePerHour,
    avgPrice: record.pricePerHour,
    bestSpot: toBestSpot(record),
    ...destinationMetadata(record.latitude, record.longitude, destination),
  };
}

function clusterToResponse(
  index: Supercluster<ParkingPointProperties, ParkingClusterProperties>,
  radius: RadiusBucket,
  feature: Supercluster.ClusterFeature<ParkingClusterProperties>,
  destination?: ParkingCoordinates,
): ParkingClusterResponse {
  const properties = feature.properties;
  const latitude =
    properties.weightedLatitude / properties.coordinateWeight;
  const longitude =
    properties.weightedLongitude / properties.coordinateWeight;
  const availabilityPercent =
    properties.totalCapacity === 0
      ? 0
      : Math.round(
          (properties.availableSpots / properties.totalCapacity) * 100,
        );

  return {
    id: `cluster:r${radius}:${properties.cluster_id}`,
    type: 'cluster',
    latitude,
    longitude,
    availabilityPercent,
    count: properties.point_count,
    zoneCount: properties.zoneIds.length,
    spotCount: properties.point_count,
    totalCapacity: properties.totalCapacity,
    availableSpots: properties.availableSpots,
    colorStatus: getAvailabilityColorStatus(availabilityPercent),
    minPrice: properties.minPrice,
    avgPrice:
      properties.pricedCount === 0
        ? null
        : Math.round((properties.priceSum / properties.pricedCount) * 100) /
          100,
    bestSpot: properties.bestSpot,
    expansionZoom: index.getClusterExpansionZoom(properties.cluster_id),
    ...destinationMetadata(latitude, longitude, destination),
  };
}

function isClusterFeature(
  feature:
    | Supercluster.ClusterFeature<ParkingClusterProperties>
    | Supercluster.PointFeature<ParkingPointProperties>,
): feature is Supercluster.ClusterFeature<ParkingClusterProperties> {
  return (
    'cluster' in feature.properties && feature.properties.cluster === true
  );
}

export function createParkingClusterEngine(records: ParkingMapRecord[]) {
  const indexes = new Map(
    RADIUS_BUCKETS.map(
      (radius) => [radius, createIndex(records, radius)] as const,
    ),
  );

  return {
    getClusters(
      bbox: ParkingBoundingBox,
      zoom: number,
      destination?: ParkingCoordinates,
    ) {
      const baseRadius = getClusterRadiusForZoom(zoom);
      const clusterBbox: [number, number, number, number] = [
        bbox.minLng,
        bbox.minLat,
        bbox.maxLng,
        bbox.maxLat,
      ];
      let radius = baseRadius;
      let index = indexes.get(radius)!;
      let features = index.getClusters(clusterBbox, Math.round(zoom));

      // Dense central areas need stronger grouping than sparse outskirts.
      // Escalating through prebuilt KD-tree indexes caps native marker work
      // without rebuilding an index during camera movement.
      for (const candidateRadius of RADIUS_BUCKETS) {
        if (
          candidateRadius <= baseRadius ||
          features.length <= MAX_VISIBLE_MARKERS
        ) {
          continue;
        }
        radius = candidateRadius;
        index = indexes.get(radius)!;
        features = index.getClusters(clusterBbox, Math.round(zoom));
      }

      return features.map((feature) =>
        isClusterFeature(feature)
          ? clusterToResponse(index, radius, feature, destination)
          : recordToResponse(feature.properties.record, destination),
      );
    },
  };
}

export function clusterParkingRecords(
  records: ParkingMapRecord[],
  bbox: ParkingBoundingBox,
  zoom: number,
  destination?: ParkingCoordinates,
) {
  return createParkingClusterEngine(records).getClusters(
    bbox,
    zoom,
    destination,
  );
}
