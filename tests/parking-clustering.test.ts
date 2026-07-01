import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createParkingClusterEngine,
  getClusterRadiusForZoom,
} from '../src/services/parking-clustering';
import type { ParkingMapRecord } from '../src/types/parking-map';
import {
  deriveCameraViewportDeltas,
  getParkingClusterRequest,
  getParkingRenderCircleClusterRequest,
  getWalkingCategory,
  haversineDistanceMeters,
} from '../src/utils/parking-map-geo';

function record(
  overrides: Partial<ParkingMapRecord> & Pick<ParkingMapRecord, 'id'>,
): ParkingMapRecord {
  const capacity = overrides.capacity ?? 10;
  const available = overrides.available ?? 5;
  return {
    id: overrides.id,
    latitude: overrides.latitude ?? 48.1351,
    longitude: overrides.longitude ?? 11.5824,
    zoneId: overrides.zoneId ?? `zone-${overrides.id}`,
    zoneName: overrides.zoneName ?? `Zone ${overrides.id}`,
    capacity,
    available,
    availabilityPercent: Math.round((available / capacity) * 100),
    updatedAt: '2026-06-24T00:00:00.000Z',
    pricePerHour: overrides.pricePerHour ?? 2,
    maxStay: null,
    restrictions: '',
    type: 'zone',
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

test('moves the parking cluster request bbox with the camera', () => {
  const munichRequest = getParkingClusterRequest({
    latitude: 48.1351,
    longitude: 11.5824,
    zoom: 16,
  });
  const pannedRequest = getParkingClusterRequest({
    latitude: 48.2351,
    longitude: 11.7824,
    zoom: 16,
  });

  assert.notEqual(munichRequest.tileKey, pannedRequest.tileKey);
  assert.notDeepEqual(munichRequest.bbox, pannedRequest.bbox);
  assert.ok(
    munichRequest.bbox.minLat < 48.1351 &&
      munichRequest.bbox.maxLat > 48.1351,
  );
  assert.ok(
    pannedRequest.bbox.minLng < 11.7824 &&
      pannedRequest.bbox.maxLng > 11.7824,
  );
});

test('centers the circular fetch bbox on the camera and map dimensions', () => {
  const camera = { latitude: 48.1351, longitude: 11.5824, zoom: 16 };
  const request = getParkingRenderCircleClusterRequest(camera, {
    width: 400,
    height: 800,
  });

  assert.ok(request);
  assert.ok(
    Math.abs(
      (request.bbox.minLng + request.bbox.maxLng) / 2 -
        camera.longitude,
    ) < 0.000001,
  );
  assert.ok(
    request.bbox.minLat < camera.latitude &&
      request.bbox.maxLat > camera.latitude,
  );
  assert.match(request.tileKey, /^parking:circle:/);
});

test('derives provider-specific viewport deltas when native events omit them', () => {
  const camera = { latitude: 48.1351, longitude: 11.5824, zoom: 16 };
  const mapSize = { width: 400, height: 800 };
  const apple = deriveCameraViewportDeltas(camera, mapSize, 'apple');
  const google = deriveCameraViewportDeltas(camera, mapSize, 'google');

  assert.ok(apple);
  assert.ok(google);
  assert.ok(apple.latitudeDelta > 0);
  assert.ok(google.latitudeDelta > 0);
  assert.equal(apple.longitudeDelta, 360 / 2 ** camera.zoom);
  assert.equal(
    google.longitudeDelta,
    (mapSize.width * 360) / (256 * 2 ** camera.zoom),
  );
});

test('panning changes the circular fetch bbox and cache key', () => {
  const mapSize = { width: 400, height: 800 };
  const first = getParkingRenderCircleClusterRequest(
    { latitude: 48.1351, longitude: 11.5824, zoom: 16 },
    mapSize,
  );
  const panned = getParkingRenderCircleClusterRequest(
    { latitude: 48.2351, longitude: 11.7824, zoom: 16 },
    mapSize,
  );

  assert.ok(first);
  assert.ok(panned);
  assert.notEqual(first.tileKey, panned.tileKey);
  assert.notDeepEqual(first.bbox, panned.bbox);
});

test('screen circle covers less geography when zoomed in', () => {
  const cameraCenter = { latitude: 48.1351, longitude: 11.5824 };
  const mapSize = { width: 400, height: 800 };
  const zoomedOut = getParkingRenderCircleClusterRequest(
    { ...cameraCenter, zoom: 14 },
    mapSize,
  );
  const zoomedIn = getParkingRenderCircleClusterRequest(
    { ...cameraCenter, zoom: 17 },
    mapSize,
  );

  assert.ok(zoomedOut);
  assert.ok(zoomedIn);
  assert.ok(
    zoomedOut.bbox.maxLng - zoomedOut.bbox.minLng >
      zoomedIn.bbox.maxLng - zoomedIn.bbox.minLng,
  );
});

test('distance metadata does not change the camera-derived fetch bbox', () => {
  const camera = { latitude: 48.1351, longitude: 11.5824, zoom: 15 };
  const withoutDestination = getParkingClusterRequest(camera);
  const withDestination = getParkingClusterRequest(camera, {
    latitude: 47.5,
    longitude: 10.5,
  });

  assert.deepEqual(withDestination.bbox, withoutDestination.bbox);
});

test('builds weighted cluster metadata and filters by viewport', () => {
  const engine = createParkingClusterEngine([
    record({ id: 'a', capacity: 10, available: 5, pricePerHour: 2 }),
    record({
      id: 'b',
      latitude: 48.1353,
      longitude: 11.5826,
      capacity: 20,
      available: 15,
      pricePerHour: 1.5,
    }),
    record({
      id: 'outside',
      latitude: 48.2,
      longitude: 11.7,
      capacity: 100,
      available: 100,
      pricePerHour: 0.5,
    }),
  ]);

  const results = engine.getClusters(
    {
      minLng: 11.57,
      minLat: 48.12,
      maxLng: 11.59,
      maxLat: 48.15,
    },
    14,
    { latitude: 48.1351, longitude: 11.5824 },
  );

  assert.equal(results.length, 1);
  const cluster = results[0];
  assert.equal(cluster.type, 'cluster');
  assert.equal(cluster.count, 2);
  assert.equal(cluster.totalCapacity, 30);
  assert.equal(cluster.availableSpots, 20);
  assert.equal(cluster.availabilityPercent, 67);
  assert.equal(cluster.minPrice, 1.5);
  assert.equal(cluster.avgPrice, 1.75);
  assert.equal(cluster.bestSpot.id, 'b');
  assert.equal(cluster.walkingCategory, 'close');
  assert.ok(cluster.expansionZoom !== undefined);
});

test('returns individual records at street-level zoom', () => {
  const engine = createParkingClusterEngine([
    record({ id: 'a' }),
    record({ id: 'b', latitude: 48.1353, longitude: 11.5826 }),
  ]);
  const results = engine.getClusters(
    {
      minLng: 11.57,
      minLat: 48.12,
      maxLng: 11.59,
      maxLat: 48.15,
    },
    17,
  );

  assert.equal(results.length, 2);
  assert.ok(results.every((item) => item.type === 'spot'));
});

test('keeps dense clustered viewports within the engine safety cap', () => {
  const records = Array.from({ length: 400 }, (_, index) =>
    record({
      id: String(index),
      latitude: 48.13 + (index % 20) * 0.0004,
      longitude: 11.57 + Math.floor(index / 20) * 0.0004,
    }),
  );
  const results = createParkingClusterEngine(records).getClusters(
    {
      minLng: 11.56,
      minLat: 48.12,
      maxLng: 11.59,
      maxLat: 48.15,
    },
    14,
  );

  assert.ok(results.length <= 180);
});

test('handles an empty Supabase result without producing markers', () => {
  const results = createParkingClusterEngine([]).getClusters(
    {
      minLng: 11.55,
      minLat: 48.12,
      maxLng: 11.6,
      maxLat: 48.16,
    },
    14,
  );

  assert.deepEqual(results, []);
});
