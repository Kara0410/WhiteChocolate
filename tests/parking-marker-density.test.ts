import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getMarkerLimitForZoom,
  projectMapCoordinate,
  projectParkingMarkers,
  projectSelectedParkingMarkers,
  selectSpatiallySeparatedMarkers,
} from '../src/components/parking-map/marker-density';
import { getAvailabilityStatus } from '../src/components/parking-map/parking-availability-status';
import { getMarkerDimensions } from '../src/components/parking-map/marker-visuals';
import type { ParkingClusterResponse } from '../src/types/parking-map';

function marker(
  id: string,
  latitude: number,
  longitude: number,
  count = 10,
): ParkingClusterResponse {
  return {
    id,
    type: 'cluster',
    latitude,
    longitude,
    availabilityPercent: 72,
    count,
    zoneCount: 4,
    spotCount: count,
    totalCapacity: count,
    availableSpots: Math.round(count * 0.72),
    colorStatus: 'green',
    minPrice: 2,
    avgPrice: 2,
    bestSpot: {
      id,
      zoneName: id,
      availableSpots: 1,
      availabilityPercent: 72,
      pricePerHour: 2,
    },
  };
}

test('maps percentage thresholds to availability status', () => {
  assert.equal(getAvailabilityStatus(100), 'high');
  assert.equal(getAvailabilityStatus(66), 'high');
  assert.equal(getAvailabilityStatus(65), 'medium');
  assert.equal(getAvailabilityStatus(33), 'medium');
  assert.equal(getAvailabilityStatus(32), 'low');
  assert.equal(getAvailabilityStatus(0), 'low');
});

test('uses compact pill canvases with room for selection effects', () => {
  assert.equal(getMarkerDimensions('spot').visualSize, 68);
  assert.equal(getMarkerDimensions('spot').width, 80);
  assert.equal(getMarkerDimensions('spot').height, 54);
  assert.equal(getMarkerDimensions('small').visualSize, 48);
  assert.equal(getMarkerDimensions('small').height, 42);
  assert.equal(getMarkerDimensions('medium').visualSize, 56);
  assert.equal(getMarkerDimensions('medium').height, 44);
  assert.equal(getMarkerDimensions('large').visualSize, 64);
  assert.equal(getMarkerDimensions('large').height, 48);
});

test('allows progressively more compact pills at closer zoom levels', () => {
  assert.equal(getMarkerLimitForZoom(10), 20);
  assert.equal(getMarkerLimitForZoom(13), 50);
  assert.equal(getMarkerLimitForZoom(15), 90);
  assert.equal(getMarkerLimitForZoom(16), 140);
});

test('suppresses visually overlapping markers at the enlarged scale', () => {
  const large = marker('large', 48.1351, 11.5824, 50);
  const overlapping = marker('small', 48.13511, 11.58241, 2);
  const separate = marker('separate', 48.148, 11.598, 10);
  const result = selectSpatiallySeparatedMarkers(
    [overlapping, separate, large],
    {
      camera: {
        latitude: 48.1351,
        longitude: 11.5824,
        zoom: 13,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      },
      width: 390,
      height: 844,
    },
  );

  assert.deepEqual(result.map((item) => item.id), ['large', 'separate']);
});

test('always prioritizes the selected marker during collision filtering', () => {
  const large = marker('large', 48.1351, 11.5824, 50);
  const selected = marker('selected', 48.13511, 11.58241, 2);
  const result = selectSpatiallySeparatedMarkers([large, selected], {
    camera: {
      latitude: 48.1351,
      longitude: 11.5824,
      zoom: 13,
      latitudeDelta: 0.04,
      longitudeDelta: 0.04,
    },
    width: 390,
    height: 844,
    selectedId: 'selected',
  });

  assert.deepEqual(result.map((item) => item.id), ['selected']);
});

test('projects a marker at the camera center into the overlay center', () => {
  const result = projectParkingMarkers(
    [marker('center', 48.1351, 11.5824)],
    {
      camera: {
        latitude: 48.1351,
        longitude: 11.5824,
        zoom: 13,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      },
      width: 400,
      height: 800,
    },
  );

  assert.ok(Math.abs(result[0].x - 200) < 0.001);
  assert.ok(Math.abs(result[0].y - 400) < 0.001);
});

test('live projection preserves an already selected marker set', () => {
  const first = marker('first', 48.1351, 11.5824);
  const overlapping = marker('overlapping', 48.13511, 11.58241);
  const result = projectSelectedParkingMarkers([first, overlapping], {
    camera: {
      latitude: 48.1351,
      longitude: 11.5824,
      zoom: 13,
    },
    width: 400,
    height: 800,
  });

  assert.deepEqual(result.map(({ item }) => item.id), [
    'first',
    'overlapping',
  ]);
});

test('projects a user coordinate from zoom when map events omit deltas', () => {
  const camera = {
    latitude: 48.1351,
    longitude: 11.5824,
    zoom: 17,
  };
  const center = projectMapCoordinate(camera, {
    camera,
    width: 400,
    height: 800,
  });
  const east = projectMapCoordinate(
    { latitude: camera.latitude, longitude: camera.longitude + 0.001 },
    { camera, width: 400, height: 800 },
  );
  const north = projectMapCoordinate(
    { latitude: camera.latitude + 0.001, longitude: camera.longitude },
    { camera, width: 400, height: 800 },
  );

  assert.ok(Math.abs(center.x - 200) < 0.001);
  assert.ok(Math.abs(center.y - 400) < 0.001);
  assert.ok(east.x > center.x);
  assert.ok(north.y < center.y);
});

test('keeps projection stable across the antimeridian', () => {
  const projected = projectMapCoordinate(
    { latitude: 0, longitude: -179.999 },
    {
      camera: { latitude: 0, longitude: 179.999, zoom: 10 },
      width: 400,
      height: 800,
    },
  );

  assert.ok(projected.x > 200);
  assert.ok(projected.x < 204);
});
