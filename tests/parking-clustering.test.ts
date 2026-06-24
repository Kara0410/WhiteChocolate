import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createParkingClusterEngine,
  getClusterRadiusForZoom,
} from '../src/services/parking-clustering';
import { getMockParkingClusters } from '../src/services/parking-clusters';
import type { ParkingMapRecord } from '../src/types/parking-map';
import {
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
  assert.equal(getClusterRadiusForZoom(10), 80);
  assert.equal(getClusterRadiusForZoom(12), 60);
  assert.equal(getClusterRadiusForZoom(15), 40);
  assert.equal(getClusterRadiusForZoom(16), 20);
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

test('returns individual records at the closest zoom', () => {
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
    19,
  );

  assert.equal(results.length, 2);
  assert.ok(results.every((item) => item.type === 'spot'));
});

test('clusters dense viewports aggressively enough for native maps', () => {
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

  assert.ok(results.length <= 120);
});

test('loads alpha map data synchronously from the bundled Munich mock data', () => {
  const results = getMockParkingClusters({
    bbox: {
      minLng: 11.55,
      minLat: 48.12,
      maxLng: 11.6,
      maxLat: 48.16,
    },
    zoom: 14,
    tileKey: 'test',
  });

  assert.ok(results.length > 0);
  assert.ok(Array.isArray(results));
});
