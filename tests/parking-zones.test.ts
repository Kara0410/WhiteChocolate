import assert from 'node:assert/strict';
import test from 'node:test';

import type { ParkingZone } from '../src/types/parking-zone';
import { parkingZonesToPolygons } from '../src/utils/parking-zones';

function zone(geojson: unknown): ParkingZone {
  return {
    id: 'zone-1',
    name: 'Test zone',
    status: 'active',
    massnahme: null,
    geojson,
  };
}

test('converts Polygon longitude-latitude pairs to map coordinates', () => {
  const polygons = parkingZonesToPolygons([
    zone({
      type: 'Polygon',
      coordinates: [
        [
          [11.5, 48.1],
          [11.6, 48.1],
          [11.6, 48.2],
          [11.5, 48.1],
        ],
      ],
    }),
  ]);

  assert.equal(polygons.length, 1);
  assert.deepEqual(polygons[0].coordinates[0], {
    latitude: 48.1,
    longitude: 11.5,
  });
});

test('creates one native polygon per MultiPolygon outer ring', () => {
  const polygons = parkingZonesToPolygons([
    zone({
      type: 'MultiPolygon',
      coordinates: [
        [[[11.5, 48.1], [11.6, 48.1], [11.5, 48.2]]],
        [[[11.7, 48.1], [11.8, 48.1], [11.7, 48.2]]],
      ],
    }),
  ]);

  assert.equal(polygons.length, 2);
  assert.deepEqual(
    polygons.map((polygon) => polygon.id),
    ['zone-1:0', 'zone-1:1'],
  );
});

test('ignores null, malformed, and unsupported geometry safely', () => {
  const polygons = parkingZonesToPolygons([
    zone(null),
    zone('{not-json'),
    zone({ type: 'Point', coordinates: [11.5, 48.1] }),
    zone({ type: 'Polygon', coordinates: [[[11.5, 48.1]]] }),
  ]);

  assert.deepEqual(polygons, []);
});
