import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildStreetAvailabilityPolylines,
  buildStreetAvailabilitySegments,
} from '../src/components/parking-map/street-availability-overlay';
import type { ParkingClusterResponse } from '../src/types/parking-map';
import type { ProjectedParkingMarker } from '../src/components/parking-map/marker-density';

const roadPath = [
  { latitude: 48.14, longitude: 11.57 },
  { latitude: 48.141, longitude: 11.571 },
  { latitude: 48.142, longitude: 11.573 },
];

function projectedMarker(
  id: string,
  options: {
    colorStatus?: ParkingClusterResponse['colorStatus'];
    lineGeometry?: ParkingClusterResponse['lineGeometry'];
    type?: ParkingClusterResponse['type'];
    x?: number;
    y?: number;
  } = {},
): ProjectedParkingMarker {
  const item = {
    id,
    type: options.type ?? 'spot',
    colorStatus: options.colorStatus ?? 'green',
    lineGeometry: options.lineGeometry === undefined ? roadPath : options.lineGeometry,
  } as ParkingClusterResponse;

  return {
    item,
    x: options.x ?? 120,
    y: options.y ?? 160,
    width: 44,
    height: 44,
    tier: 'small' as ProjectedParkingMarker['tier'],
  };
}

test('street paths track only visible result bubbles with complete source geometry', () => {
  const markers = [
    projectedMarker('visible'),
    projectedMarker('offscreen', { x: 450 }),
    projectedMarker('cluster', { type: 'cluster' }),
    projectedMarker('unknown', { colorStatus: 'neutral' }),
    projectedMarker('invalid', {
      lineGeometry: [{ latitude: Number.NaN, longitude: 11.57 }, roadPath[1]],
    }),
  ];

  const segments = buildStreetAvailabilitySegments(markers, {
    activeSearchResults: true,
    mapHeight: 800,
    mapWidth: 400,
  });

  assert.deepEqual(segments, [
    { id: 'visible', coordinates: roadPath, colorStatus: 'green' },
  ]);
});

test('street paths are empty outside active destination search results', () => {
  assert.deepEqual(
    buildStreetAvailabilitySegments([projectedMarker('visible')], {
      activeSearchResults: false,
      mapHeight: 800,
      mapWidth: 400,
    }),
    [],
  );
});

test('street lines use the saturated Figma colors and bold native widths', () => {
  const polylines = buildStreetAvailabilityPolylines([
    { id: 'green', coordinates: roadPath, colorStatus: 'green' },
    { id: 'orange', coordinates: roadPath, colorStatus: 'orange' },
    { id: 'red', coordinates: roadPath, colorStatus: 'red' },
  ]);

  assert.deepEqual(
    polylines.filter(({ id }) => !id.endsWith(':halo')).map(({ color }) => color),
    ['#71E517', '#FF9500', '#E51717'],
  );
  assert.ok(polylines.every(({ width }) => width >= 12));
});
