import assert from 'node:assert/strict';
import test from 'node:test';

import {
  filterParkingMarkersForScreenCircle,
  filterParkingMarkersForViewport,
  getDisplayedParkingMarkerItems,
  getMarkerLimitForZoom,
  projectMapCoordinate,
  projectParkingMarkers,
  projectSelectedParkingMarkers,
  selectSpatiallySeparatedMarkers,
} from '../src/components/parking-map/marker-density';
import { getAvailabilityStatus } from '../src/components/parking-map/parking-availability-status';
import {
  formatSpotCount,
  getMarkerDimensions,
} from '../src/components/parking-map/marker-visuals';
import type { ParkingClusterResponse } from '../src/types/parking-map';
import {
  createBufferedViewportBounds,
  createParkingRenderCircleBounds,
  createParkingSearchFocusCamera,
  hasValidParkingCoordinates,
  isCoordinateInsideBounds,
} from '../src/utils/parking-map-geo';

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

test('formats cluster labels with singular, plural, and a readable cap', () => {
  assert.equal(formatSpotCount(1), '1 Spot');
  assert.equal(formatSpotCount(2), '2 Spots');
  assert.equal(formatSpotCount(99), '99 Spots');
  assert.equal(formatSpotCount(1_500), '999+ Spots');
});

test('caps zone summary labels at the configured threshold', () => {
  assert.equal(formatSpotCount(1, { capped: true, cap: 50 }), '1 Spot');
  assert.equal(formatSpotCount(49, { capped: true, cap: 50 }), '49 Spots');
  assert.equal(formatSpotCount(50, { capped: true, cap: 50 }), '50+ Spots');
  assert.equal(formatSpotCount(73, { capped: true, cap: 50 }), '50+ Spots');
  assert.equal(formatSpotCount(73, { capped: false }), '73 Spots');
  assert.equal(formatSpotCount(73, { capped: true }), '50+ Spots');
});

test('validates user coordinates before map projection', () => {
  assert.equal(
    hasValidParkingCoordinates({ latitude: 48.1351, longitude: 11.5824 }),
    true,
  );
  assert.equal(
    hasValidParkingCoordinates({ latitude: 91, longitude: 11.5824 }),
    false,
  );
  assert.equal(
    hasValidParkingCoordinates({ latitude: 48.1351, longitude: -181 }),
    false,
  );
  assert.equal(
    hasValidParkingCoordinates({ latitude: Number.NaN, longitude: 11.5824 }),
    false,
  );
});

test('buffers viewport bounds without retaining far-away markers', () => {
  const bounds = createBufferedViewportBounds({
    latitude: 48.1351,
    longitude: 11.5824,
    zoom: 14,
    latitudeDelta: 0.04,
    longitudeDelta: 0.06,
  });
  assert.ok(bounds);

  assert.equal(
    isCoordinateInsideBounds(
      { latitude: 48.1351, longitude: 11.5824 },
      bounds,
    ),
    true,
  );
  assert.equal(
    isCoordinateInsideBounds(
      { latitude: 48.1605, longitude: 11.5824 },
      bounds,
    ),
    true,
  );
  assert.equal(
    isCoordinateInsideBounds(
      { latitude: 48.3, longitude: 11.9 },
      bounds,
    ),
    false,
  );
});

test('buffered viewport bounds support the antimeridian', () => {
  const bounds = createBufferedViewportBounds({
    latitude: 0,
    longitude: 179.99,
    zoom: 12,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  });
  assert.ok(bounds);

  assert.equal(
    isCoordinateInsideBounds(
      { latitude: 0, longitude: -179.99 },
      bounds,
    ),
    true,
  );
});

test('derives generous viewport bounds when native map events omit deltas', () => {
  const bounds = createBufferedViewportBounds({
    latitude: 48.1351,
    longitude: 11.5824,
    zoom: 17,
  });

  assert.ok(bounds);
  assert.equal(
    isCoordinateInsideBounds(
      { latitude: 48.1351, longitude: 11.5824 },
      bounds,
    ),
    true,
  );
});

test('returns null when viewport bounds cannot be computed safely', () => {
  assert.equal(
    createBufferedViewportBounds({
      latitude: 48.1351,
      longitude: 11.5824,
      zoom: Number.NaN,
    }),
    null,
  );
});

test('keeps server-filtered markers when inferred bounds remove everything', () => {
  const serverMarkers = [
    marker('server-nearby', 48.2, 11.7),
    marker('server-nearby-2', 48.21, 11.71),
  ];
  const result = filterParkingMarkersForViewport(serverMarkers, {
    latitude: 48.1351,
    longitude: 11.5824,
    zoom: 17,
  });

  assert.equal(result.usedServerFallback, true);
  assert.deepEqual(result.markers, serverMarkers);
});

test('still removes far markers when the buffered viewport has matches', () => {
  const nearby = marker('nearby', 48.1351, 11.5824);
  const far = marker('far', 48.3, 11.9);
  const result = filterParkingMarkersForViewport([nearby, far], {
    latitude: 48.1351,
    longitude: 11.5824,
    zoom: 14,
    latitudeDelta: 0.04,
    longitudeDelta: 0.06,
  });

  assert.equal(result.usedServerFallback, false);
  assert.deepEqual(result.markers, [nearby]);
});

test('screen circle keeps markers inside and removes markers outside', () => {
  const inside = marker('inside-circle', 48.1351, 11.5924);
  const outside = marker('outside-circle', 48.1351, 11.6124);
  const result = filterParkingMarkersForScreenCircle([inside, outside], {
    camera: {
      latitude: 48.1351,
      longitude: 11.5824,
      zoom: 14,
      latitudeDelta: 0.04,
      longitudeDelta: 0.04,
    },
    width: 400,
    height: 800,
  });

  assert.ok(result.radiusPixels);
  assert.equal(result.radiusPixels, 208);
  assert.deepEqual(result.markers, [inside]);
});

test('screen circle falls back safely before map dimensions are ready', () => {
  const markers = [marker('first', 48.1351, 11.5824)];
  const result = filterParkingMarkersForScreenCircle(markers, {
    camera: { latitude: 48.1351, longitude: 11.5824, zoom: 14 },
    width: 0,
    height: 0,
  });

  assert.equal(result.usedServerFallback, true);
  assert.deepEqual(result.markers, markers);
});

test('screen circle keeps bbox markers when every marker is outside', () => {
  const outside = marker('outside', 48.1351, 11.6224);
  const result = filterParkingMarkersForScreenCircle([outside], {
    camera: {
      latitude: 48.1351,
      longitude: 11.5824,
      zoom: 14,
      latitudeDelta: 0.04,
      longitudeDelta: 0.04,
    },
    width: 400,
    height: 800,
  });

  assert.equal(result.removedAllMarkers, true);
  assert.equal(result.usedServerFallback, true);
  assert.deepEqual(result.markers, [outside]);
});

test('screen circle reports its approximate radius in pixels and meters', () => {
  const result = filterParkingMarkersForScreenCircle(
    [marker('center', 48.1351, 11.582)],
    {
      camera: {
        latitude: 48.1351,
        longitude: 11.582,
        zoom: 14,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      },
      width: 400,
      height: 800,
    },
  );

  assert.equal(result.radiusPixels, 208);
  assert.ok(result.radiusMeters);
  assert.ok(result.radiusMeters > 1_150);
  assert.ok(result.radiusMeters < 1_160);
});

test('selected marker bypasses the circular marker list', () => {
  const inside = marker('inside', 48.1351, 11.5824);
  const selectedOutside = marker('selected-outside', 48.3, 11.9);

  assert.deepEqual(
    getDisplayedParkingMarkerItems(
      [inside],
      selectedOutside,
      [inside],
      false,
    ),
    [selectedOutside],
  );
});

test('search focus camera keeps the destination above the half-height sheet', () => {
  const destination = { latitude: 48.1351, longitude: 11.5824 };
  const mapSize = { width: 400, height: 800 };
  const camera = createParkingSearchFocusCamera(
    destination,
    mapSize,
    'google',
  );

  assert.ok(camera);
  const projected = projectMapCoordinate(destination, {
    camera,
    ...mapSize,
  });
  const fetchBounds = createParkingRenderCircleBounds(camera, mapSize);

  assert.ok(fetchBounds);
  assert.ok(Math.abs(projected.x - mapSize.width / 2) < 0.001);
  assert.ok(Math.abs(projected.y - mapSize.height / 4) < 0.001);
  assert.equal(isCoordinateInsideBounds(destination, fetchBounds), true);
});

test('search mode renders only its stable nearest parking markers', () => {
  const normal = marker('normal', 48.1351, 11.5824);
  const nearest = [
    marker('nearest-1', 48.136, 11.5824),
    marker('nearest-2', 48.137, 11.5824),
  ];

  assert.deepEqual(
    getDisplayedParkingMarkerItems([normal], null, nearest, false),
    nearest,
  );
  assert.deepEqual(
    getDisplayedParkingMarkerItems([normal], null, null, true),
    [],
  );
});

test('maps percentage thresholds to availability status', () => {
  assert.equal(getAvailabilityStatus(100), 'high');
  assert.equal(getAvailabilityStatus(66), 'high');
  assert.equal(getAvailabilityStatus(65), 'medium');
  assert.equal(getAvailabilityStatus(33), 'medium');
  assert.equal(getAvailabilityStatus(32), 'low');
  assert.equal(getAvailabilityStatus(0), 'low');
});

test('uses readable spot-count pills with room for selection effects', () => {
  assert.equal(getMarkerDimensions('spot').visualSize, 68);
  assert.equal(getMarkerDimensions('spot').width, 78);
  assert.equal(getMarkerDimensions('spot').height, 50);
  assert.equal(getMarkerDimensions('small').visualSize, 76);
  assert.equal(getMarkerDimensions('small').width, 84);
  assert.equal(getMarkerDimensions('small').height, 40);
  assert.equal(getMarkerDimensions('medium').visualSize, 82);
  assert.equal(getMarkerDimensions('medium').width, 90);
  assert.equal(getMarkerDimensions('medium').height, 42);
  assert.equal(getMarkerDimensions('large').visualSize, 88);
  assert.equal(getMarkerDimensions('large').width, 96);
  assert.equal(getMarkerDimensions('large').height, 44);
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
