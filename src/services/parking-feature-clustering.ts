import Supercluster from 'supercluster';

import { getClusterRadiusForZoom } from '@/services/parking-clustering';
import type {
  ParkingAggregateStats,
  ParkingBoundingBox,
  ParkingCoordinates,
  ParkingMapFeature,
  ParkingSegmentClusterMapFeature,
  ParkingSegmentMapFeature,
  ParkingSegmentSummary,
} from '@/types/parking-domain';
import { aggregateParkingSegments } from '@/utils/parking-domain';

const MAX_CLUSTER_ZOOM = 16;
const MAX_CLUSTER_FEATURES = 180;
const OUTSIDE_ZONE_GROUP = '__unassigned__';

type PointProperties = { segment: ParkingSegmentSummary };
type ClusterProperties = {
  segments: ParkingSegmentSummary[];
};

function segmentStats(segment: ParkingSegmentSummary): ParkingAggregateStats {
  return aggregateParkingSegments([segment]);
}

export function parkingSegmentToMapFeature(
  segment: ParkingSegmentSummary,
): ParkingSegmentMapFeature {
  return {
    id: segment.id,
    kind: 'segment',
    coordinates: segment.coordinates,
    stats: segmentStats(segment),
    parentId: segment.zoneId,
    segment,
  };
}

function pointFeature(segment: ParkingSegmentSummary) {
  return {
    type: 'Feature' as const,
    geometry: {
      type: 'Point' as const,
      coordinates: [
        segment.coordinates.longitude,
        segment.coordinates.latitude,
      ] as [number, number],
    },
    properties: { segment },
  };
}

function createIndex(segments: ParkingSegmentSummary[], radius: number) {
  return new Supercluster<PointProperties, ClusterProperties>({
    minZoom: 0,
    maxZoom: MAX_CLUSTER_ZOOM,
    radius,
    extent: 512,
    nodeSize: 64,
    minPoints: 2,
    map: ({ segment }) => ({ segments: [segment] }),
    reduce: (accumulated, next) => {
      accumulated.segments.push(...next.segments);
    },
  }).load(segments.map(pointFeature));
}

function isCluster(
  feature:
    | Supercluster.ClusterFeature<ClusterProperties>
    | Supercluster.PointFeature<PointProperties>,
): feature is Supercluster.ClusterFeature<ClusterProperties> {
  return (
    'cluster' in feature.properties && feature.properties.cluster === true
  );
}

export function clusterParkingSegmentFeatures(input: {
  segments: ParkingSegmentSummary[];
  bounds: ParkingBoundingBox;
  zoom: number;
}): ParkingMapFeature[] {
  const grouped = new Map<string, ParkingSegmentSummary[]>();
  for (const segment of input.segments) {
    const key = segment.zoneId ?? OUTSIDE_ZONE_GROUP;
    const group = grouped.get(key);
    if (group) {
      group.push(segment);
    } else {
      grouped.set(key, [segment]);
    }
  }

  const radius = getClusterRadiusForZoom(input.zoom);
  const bbox: [number, number, number, number] = [
    input.bounds.minLng,
    input.bounds.minLat,
    input.bounds.maxLng,
    input.bounds.maxLat,
  ];
  const features: ParkingMapFeature[] = [];

  for (const [zoneKey, segments] of grouped) {
    const index = createIndex(segments, radius);
    for (const feature of index.getClusters(bbox, Math.round(input.zoom))) {
      if (!isCluster(feature)) {
        features.push(parkingSegmentToMapFeature(feature.properties.segment));
        continue;
      }

      const clusterSegments = feature.properties.segments;
      const coordinates: ParkingCoordinates = {
        longitude: feature.geometry.coordinates[0],
        latitude: feature.geometry.coordinates[1],
      };
      const cluster: ParkingSegmentClusterMapFeature = {
        id: `segment-cluster:${zoneKey}:${radius}:${feature.properties.cluster_id}`,
        kind: 'segment-cluster',
        coordinates,
        stats: aggregateParkingSegments(clusterSegments),
        parentId: zoneKey === OUTSIDE_ZONE_GROUP ? null : zoneKey,
        zoneId: zoneKey === OUTSIDE_ZONE_GROUP ? null : zoneKey,
        expansionZoom: index.getClusterExpansionZoom(
          feature.properties.cluster_id,
        ),
      };
      features.push(cluster);
    }
  }

  return features.slice(0, MAX_CLUSTER_FEATURES);
}
