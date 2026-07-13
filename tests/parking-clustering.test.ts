import assert from 'node:assert/strict';
import test from 'node:test';

import {
  clusterParkingSegmentFeatures,
  parkingSegmentToMapFeature,
} from '../src/services/parking-feature-clustering';
import { getClusterRadiusForZoom } from '../src/services/parking-clustering';
import type {
  ParkingBoundingBox,
  ParkingSegmentSummary,
} from '../src/types/parking-domain';
import {
  deriveCameraViewportDeltas,
  getParkingClusterRequest,
  getParkingRenderCircleClusterRequest,
  getWalkingCategory,
  haversineDistanceMeters,
} from '../src/utils/parking-map-geo';

const BOUNDS: ParkingBoundingBox = {
  minLng: 11.56,
  minLat: 48.12,
  maxLng: 11.6,
  maxLat: 48.16,
};

function segment(
  id: string,
  overrides: Partial<ParkingSegmentSummary> = {},
): ParkingSegmentSummary {
  return {
    id,
    zoneId: 'zone-a',
    streetName: `Street ${id}`,
    sourceAreaName: null,
    coordinates: { latitude: 48.1351, longitude: 11.5824 },
    capacity: 10,
    pricing: {
      status: 'paid',
      currency: 'EUR',
      hourlyRate: 2,
      dailyRate: null,
    },
    availability: {
      status: 'estimated',
      availableSpaces: 5,
      totalSpaces: 10,
      percent: 50,
      confidence: null,
      observedAt: null,
    },
    updatedAt: '2026-07-13T10:00:00.000Z',
    ...overrides,
  };
}

test('uses behavior-based radius buckets', () => {
  assert.equal(getClusterRadiusForZoom(10), 64);
  assert.equal(getClusterRadiusForZoom(12), 48);
  assert.equal(getClusterRadiusForZoom(15), 32);
  assert.equal(getClusterRadiusForZoom(16), 16);
});

test('calculates walking thresholds with Haversine distance', () => {
  assert.equal(getWalkingCategory(416), 'close');
  assert.equal(getWalkingCategory(417), 'acceptable');
  assert.equal(getWalkingCategory(624), 'acceptable');
  assert.equal(getWalkingCategory(625), 'far');
  const distance = haversineDistanceMeters(
    { latitude: 48.1351, longitude: 11.5824 },
    { latitude: 48.1387, longitude: 11.5824 },
  );
  assert.ok(distance > 390 && distance < 410);
});

test('camera requests move with the viewport and preserve compact cache keys', () => {
  const first = getParkingClusterRequest({
    latitude: 48.1351,
    longitude: 11.5824,
    zoom: 16,
  });
  const panned = getParkingClusterRequest({
    latitude: 48.2351,
    longitude: 11.7824,
    zoom: 16,
  });
  assert.notEqual(first.tileKey, panned.tileKey);
  assert.notDeepEqual(first.bbox, panned.bbox);
});

test('circular requests use map dimensions and shrink when zooming in', () => {
  const mapSize = { width: 400, height: 800 };
  const zoomedOut = getParkingRenderCircleClusterRequest(
    { latitude: 48.1351, longitude: 11.5824, zoom: 14 },
    mapSize,
  );
  const zoomedIn = getParkingRenderCircleClusterRequest(
    { latitude: 48.1351, longitude: 11.5824, zoom: 17 },
    mapSize,
  );
  assert.ok(zoomedOut);
  assert.ok(zoomedIn);
  assert.ok(
    zoomedOut.bbox.maxLng - zoomedOut.bbox.minLng >
      zoomedIn.bbox.maxLng - zoomedIn.bbox.minLng,
  );
  assert.match(zoomedIn.tileKey, /^parking:circle:/);
});

test('derives provider-specific viewport deltas when native events omit them', () => {
  const camera = { latitude: 48.1351, longitude: 11.5824, zoom: 16 };
  const mapSize = { width: 400, height: 800 };
  const apple = deriveCameraViewportDeltas(camera, mapSize, 'apple');
  const google = deriveCameraViewportDeltas(camera, mapSize, 'google');
  assert.ok(apple);
  assert.ok(google);
  assert.equal(apple.longitudeDelta, 360 / 2 ** camera.zoom);
  assert.equal(
    google.longitudeDelta,
    (mapSize.width * 360) / (256 * 2 ** camera.zoom),
  );
});

test('segment clusters never cross known administrative-zone boundaries', () => {
  const features = clusterParkingSegmentFeatures({
    segments: [
      segment('a', { zoneId: 'zone-a' }),
      segment('b', {
        zoneId: 'zone-b',
        coordinates: { latitude: 48.13511, longitude: 11.58241 },
      }),
    ],
    bounds: BOUNDS,
    zoom: 14.8,
  });
  assert.equal(features.length, 2);
  assert.deepEqual(
    features.map((feature) => feature.parentId).sort(),
    ['zone-a', 'zone-b'],
  );
});

test('same-zone segments form a stable aggregate with expansion zoom', () => {
  const features = clusterParkingSegmentFeatures({
    segments: [
      segment('a'),
      segment('b', {
        capacity: 20,
        coordinates: { latitude: 48.13511, longitude: 11.58241 },
        availability: {
          status: 'estimated',
          availableSpaces: 15,
          totalSpaces: 20,
          percent: 75,
          confidence: null,
          observedAt: null,
        },
      }),
    ],
    bounds: BOUNDS,
    zoom: 14.8,
  });
  assert.equal(features.length, 1);
  const feature = features[0];
  assert.equal(feature.kind, 'segment-cluster');
  assert.equal(feature.stats.segmentCount, 2);
  assert.equal(feature.stats.totalCapacity, 30);
  assert.equal(feature.stats.availableCapacity, 20);
  assert.ok(
    feature.kind === 'segment-cluster' && feature.expansionZoom > 14.8,
  );
});

test('individual segment projections retain stable identity', () => {
  const feature = parkingSegmentToMapFeature(segment('stable-id'));
  assert.equal(feature.kind, 'segment');
  assert.equal(feature.id, 'stable-id');
  assert.equal(feature.segment.id, 'stable-id');
});

test('dense clustered viewports stay within the marker safety cap', () => {
  const segments = Array.from({ length: 500 }, (_, index) =>
    segment(String(index), {
      zoneId: null,
      coordinates: {
        latitude: 48.13 + (index % 25) * 0.0005,
        longitude: 11.57 + Math.floor(index / 25) * 0.0005,
      },
    }),
  );
  const features = clusterParkingSegmentFeatures({
    segments,
    bounds: BOUNDS,
    zoom: 15.5,
  });
  assert.ok(features.length <= 180);
});

test('empty segment results remain a valid empty layer', () => {
  assert.deepEqual(
    clusterParkingSegmentFeatures({ segments: [], bounds: BOUNDS, zoom: 15 }),
    [],
  );
});
