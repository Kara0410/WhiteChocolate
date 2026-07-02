import assert from 'node:assert/strict';
import test from 'node:test';

import type { ParkingZone } from '../src/types/parking-zone';
import {
  buildZoneSummaries,
  createParkingZoneMatcher,
  getZoneFocusZoom,
  getZoneRepresentativePoint,
  isCoordinateInsidePolygon,
  parkingZonesToPolygons,
} from '../src/utils/parking-zones';

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

test('matches points inside zones and treats polygon boundaries as contained', () => {
  const polygon = [
    { latitude: 48.1, longitude: 11.5 },
    { latitude: 48.1, longitude: 11.6 },
    { latitude: 48.2, longitude: 11.6 },
    { latitude: 48.2, longitude: 11.5 },
  ];
  const matchZone = createParkingZoneMatcher([
    {
      id: 'zone-1:0',
      zoneId: 'zone-1',
      zoneName: 'Test zone',
      coordinates: polygon,
    },
  ]);

  assert.equal(
    isCoordinateInsidePolygon(
      { latitude: 48.15, longitude: 11.55 },
      polygon,
    ),
    true,
  );
  assert.deepEqual(
    matchZone({ latitude: 48.1, longitude: 11.55 }),
    { zoneId: 'zone-1', zoneName: 'Test zone' },
  );
  assert.equal(
    matchZone({ latitude: 48.3, longitude: 11.7 }),
    null,
  );
});

test('zone representative point stays inside a concave polygon', () => {
  // U-shaped polygon whose centroid falls inside the notch (outside the shape).
  const uShape = [
    { latitude: 48.0, longitude: 11.0 },
    { latitude: 48.0, longitude: 11.5 },
    { latitude: 48.5, longitude: 11.5 },
    { latitude: 48.5, longitude: 11.4 },
    { latitude: 48.1, longitude: 11.4 },
    { latitude: 48.1, longitude: 11.1 },
    { latitude: 48.5, longitude: 11.1 },
    { latitude: 48.5, longitude: 11.0 },
  ];
  const polygon = {
    id: 'zone-u:0',
    zoneId: 'zone-u',
    zoneName: 'U zone',
    coordinates: uShape,
  };

  const point = getZoneRepresentativePoint(polygon);
  assert.equal(isCoordinateInsidePolygon(point, uShape), true);
});

test('builds one capped summary per zone from assigned spots', () => {
  const polygons = parkingZonesToPolygons([
    zone({
      type: 'Polygon',
      coordinates: [
        [
          [11.5, 48.1],
          [11.6, 48.1],
          [11.6, 48.2],
          [11.5, 48.2],
          [11.5, 48.1],
        ],
      ],
    }),
  ]);
  const spots = [
    ...Array.from({ length: 3 }, (_, index) => ({
      latitude: 48.15,
      longitude: 11.55,
      zoneId: 'zone-1',
      zoneName: 'Test zone',
      id: `spot-${index}`,
    })),
    { latitude: 48.15, longitude: 11.55, zoneId: null, zoneName: null },
  ];

  const summaries = buildZoneSummaries(spots, polygons);
  assert.equal(summaries.length, 1);
  assert.equal(summaries[0].zoneId, 'zone-1');
  assert.equal(summaries[0].spotCount, 3);
  assert.equal(
    isCoordinateInsidePolygon(summaries[0], polygons[0].coordinates),
    true,
  );
});

test('zone focus zoom fits small zones but always lands in spot detail', () => {
  const polygons = parkingZonesToPolygons([
    zone({
      type: 'Polygon',
      coordinates: [
        [
          [11.5, 48.1],
          [11.6, 48.1],
          [11.6, 48.2],
          [11.5, 48.2],
          [11.5, 48.1],
        ],
      ],
    }),
  ]);

  const largeZoneZoom = getZoneFocusZoom(polygons, 'zone-1', 400, 15.2);
  assert.equal(largeZoneZoom, 15.2);

  const unknownZoneZoom = getZoneFocusZoom(polygons, 'missing', 400, 15.2);
  assert.equal(unknownZoneZoom, 15.2);

  const tinyPolygons = parkingZonesToPolygons([
    zone({
      type: 'Polygon',
      coordinates: [
        [
          [11.5, 48.1],
          [11.5001, 48.1],
          [11.5001, 48.1001],
          [11.5, 48.1],
        ],
      ],
    }),
  ]);
  const tinyZoneZoom = getZoneFocusZoom(tinyPolygons, 'zone-1', 400, 15.2);
  assert.equal(tinyZoneZoom, 17);
});
