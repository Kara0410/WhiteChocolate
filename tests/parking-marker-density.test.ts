import assert from 'node:assert/strict';
import test from 'node:test';

import { selectSpatiallySeparatedMarkers } from '../src/components/parking-map/marker-density';
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

test('keeps every marker at least as large as the parking action button', () => {
  assert.equal(getMarkerDimensions('spot').visualSize, 256);
  assert.equal(getMarkerDimensions('small').visualSize, 312);
  assert.equal(getMarkerDimensions('medium').visualSize, 360);
  assert.equal(getMarkerDimensions('large').visualSize, 416);
});

test('suppresses visually overlapping markers without changing cluster data', () => {
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

  assert.deepEqual(
    result.map((item) => item.id),
    ['large', 'separate'],
  );
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
