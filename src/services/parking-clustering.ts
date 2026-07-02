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

const MAX_CLUSTER_ZOOM = 16;
const MAX_VISIBLE_MARKERS = 180;

type RadiusBucket = 16 | 24 | 32 | 48 | 64 | 80 | 100 | 120;
const RADIUS_BUCKETS: RadiusBucket[] = [16, 24, 32, 48, 64, 80, 100, 120];

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

type ParkingClusterGroup = {
  key: string;
  records: ParkingMapRecord[];
  zoneId: string | null;
  zoneName: string | null;
};

type ParkingClusterGroupIndex = Omit<ParkingClusterGroup, 'records'> & {
  index: Supercluster<ParkingPointProperties, ParkingClusterProperties>;
};

const OUTSIDE_ZONE_GROUP = '__outside_munich_parking_zones__';

/**
 * Supercluster measures radius in screen pixels. Combined with Web Mercator
 * zoom, these buckets approximate how people make parking decisions:
 * - <= 10: broad city scanning
 * - 11-13: driving areas (roughly a few kilometres across)
 * - 14-15: walking-relevance areas (roughly 416-624 m across at Munich)
 * - 16: tiny clusters that resolve into individual records at zoom 17
 */
export function getClusterRadiusForZoom(zoom: number): RadiusBucket {
  if (zoom <= 10) {
    return 64;
  }
  if (zoom <= 13) {
    return 48;
  }
  if (zoom <= 15) {
    return 32;
  }
  return 16;
}

function toBestSpot(record: ParkingMapRecord): ParkingBestSpot {
  return {
    id: record.id,
    zoneName: record.parkingZoneName ?? record.zoneName,
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
        zoneIds:
          record.parkingZoneId === null ? [] : [record.parkingZoneId],
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

export function parkingRecordToResponse(
  record: ParkingMapRecord,
  destination?: ParkingCoordinates,
): ParkingClusterResponse {
  return {
    id: record.id,
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
    zoneId: record.parkingZoneId,
    zoneName: record.parkingZoneName,
    ...destinationMetadata(record.latitude, record.longitude, destination),
  };
}

function clusterToResponse(
  index: Supercluster<ParkingPointProperties, ParkingClusterProperties>,
  radius: RadiusBucket,
  feature: Supercluster.ClusterFeature<ParkingClusterProperties>,
  group: Pick<ParkingClusterGroup, 'key' | 'zoneId' | 'zoneName'>,
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
    id: `cluster:${group.key}:r${radius}:${properties.cluster_id}`,
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
    zoneId: group.zoneId,
    zoneName: group.zoneName,
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
  /*
   * Clustering pipeline:
   * 1. use only records returned for the current bbox/camera circle;
   * 2. assign those records to real Munich polygon zones before this service;
   * 3. run Supercluster independently per zone using zoom-based pixel radii;
   * 4. let the map's circle and screen-collision passes limit final overlays.
   *
   * Separate zone indexes prevent a visual cluster from spanning two license
   * zones while preserving the existing spot response and press behavior.
   * Records outside every polygon share one fallback spatial group.
   */
  const groupedRecords = new Map<string, ParkingClusterGroup>();
  for (const record of records) {
    const key = record.parkingZoneId ?? OUTSIDE_ZONE_GROUP;
    const existing = groupedRecords.get(key);
    if (existing) {
      existing.records.push(record);
    } else {
      groupedRecords.set(key, {
        key,
        records: [record],
        zoneId: record.parkingZoneId,
        zoneName: record.parkingZoneName,
      });
    }
  }

  const indexes = new Map<RadiusBucket, ParkingClusterGroupIndex[]>();
  const getIndexes = (radius: RadiusBucket) => {
    const cached = indexes.get(radius);
    if (cached) {
      return cached;
    }

    const created = [...groupedRecords.values()].map(
      ({ key, records: groupRecords, zoneId, zoneName }) => ({
        key,
        zoneId,
        zoneName,
        index: createIndex(groupRecords, radius),
      }),
    );
    indexes.set(radius, created);
    return created;
  };

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
      let groupFeatures = getIndexes(radius).flatMap((group) =>
        group.index
          .getClusters(clusterBbox, Math.round(zoom))
          .map((feature) => ({ feature, group })),
      );

      // Dense central areas still need a safety cap, but the overlay density
      // pass now handles the final visible marker count for compact pills.
      for (const candidateRadius of RADIUS_BUCKETS) {
        if (
          candidateRadius <= baseRadius ||
          groupFeatures.length <= MAX_VISIBLE_MARKERS
        ) {
          continue;
        }
        radius = candidateRadius;
        groupFeatures = getIndexes(radius).flatMap((group) =>
          group.index
            .getClusters(clusterBbox, Math.round(zoom))
            .map((feature) => ({ feature, group })),
        );
      }

      return groupFeatures.map(({ feature, group }) =>
        isClusterFeature(feature)
          ? clusterToResponse(
              group.index,
              radius,
              feature,
              group,
              destination,
            )
          : parkingRecordToResponse(feature.properties.record, destination),
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
