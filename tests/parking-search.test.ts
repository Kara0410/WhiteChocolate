import assert from 'node:assert/strict';
import test from 'node:test';

import type { ParkingClusterResponse } from '../src/types/parking-map';
import { getDisplayedParkingMarkerItems } from '../src/components/parking-map/marker-density';
import {
  buildStreetAvailabilityPolylines,
  buildStreetAvailabilitySegments,
} from '../src/components/parking-map/street-availability-overlay';
import {
  formatParkingPriceLabel,
  getCuratedNearbyParkingSpots,
} from '../src/utils/parkingSearch';

const ORIGIN = { latitude: 48.137, longitude: 11.575 };
const METERS_PER_DEGREE_LATITUDE = 111_320;

function latitudeMetersNorth(meters: number) {
  return ORIGIN.latitude + meters / METERS_PER_DEGREE_LATITUDE;
}

function spot(
  overrides: Partial<ParkingClusterResponse> & { id: string },
): ParkingClusterResponse {
  return {
    type: 'spot',
    latitude: ORIGIN.latitude,
    longitude: ORIGIN.longitude,
    availabilityPercent: 50,
    count: 1,
    totalCapacity: 10,
    availableSpots: 5,
    colorStatus: 'orange',
    lineGeometry: null,
    minPrice: 2,
    avgPrice: 2,
    pricingStatus: 'paid',
    bestSpot: {
      id: overrides.id,
      label: `Segment ${overrides.id}`,
      availableSpots: 5,
      availabilityPercent: 50,
      pricePerHour: 2,
    },
    ...overrides,
  };
}

test('returns nothing for an invalid origin', () => {
  assert.deepEqual(
    getCuratedNearbyParkingSpots({
      origin: { latitude: Number.NaN, longitude: 11.575 },
      spots: [spot({ id: 'a' })],
    }),
    [],
  );
});

test('sorts by distance and respects the limit', () => {
  const results = getCuratedNearbyParkingSpots({
    origin: ORIGIN,
    spots: [
      spot({ id: 'far', latitude: latitudeMetersNorth(500) }),
      spot({ id: 'near', latitude: latitudeMetersNorth(100) }),
      spot({ id: 'farthest', latitude: latitudeMetersNorth(1000) }),
    ],
    limit: 2,
  });
  assert.deepEqual(results.map((result) => result.id), ['near', 'far']);
  assert.equal(results[0].distanceFromSearchMeters, 100);
});

test('groups one nearby street into one recommendation with count-based availability', () => {
  const results = getCuratedNearbyParkingSpots({
    origin: ORIGIN,
    spots: [
      spot({
        id: 'segment-a',
        latitude: latitudeMetersNorth(100),
        streetCorridorKey: 'Knollerstr.',
        availabilityPercent: 10,
        availableSpots: 1,
        totalCapacity: 10,
        bestSpot: {
          id: 'segment-a',
          label: 'Knollerstr.',
          availableSpots: 1,
          availabilityPercent: 10,
          pricePerHour: 2,
        },
      }),
      spot({
        id: 'segment-b',
        latitude: latitudeMetersNorth(110),
        streetCorridorKey: 'Knollerstraße',
        availabilityPercent: 30,
        availableSpots: 9,
        totalCapacity: 30,
        bestSpot: {
          id: 'segment-b',
          label: 'Knollerstraße',
          availableSpots: 9,
          availabilityPercent: 30,
          pricePerHour: 2,
        },
      }),
    ],
  });

  assert.equal(results.length, 1);
  assert.equal(results[0].bestSpot.label, 'Knollerstr.');
  assert.equal(results[0].availabilityPercent, 25);
  assert.equal(results[0].availableSpots, 10);
  assert.equal(results[0].totalCapacity, 40);
  assert.equal(results[0].distanceFromSearchMeters, 100);
  assert.equal(results[0].underlyingParkingRecords?.length, 2);
});

test('falls back to averaging percentages when street-level counts are unavailable', () => {
  const results = getCuratedNearbyParkingSpots({
    origin: ORIGIN,
    spots: [
      spot({
        id: 'fend-a',
        streetCorridorKey: 'Fendstr.',
        totalCapacity: 0,
        availableSpots: null,
        availabilityPercent: 20,
      }),
      spot({
        id: 'fend-b',
        streetCorridorKey: 'Fendstraße',
        totalCapacity: 0,
        availableSpots: null,
        availabilityPercent: 80,
      }),
    ],
  });

  assert.equal(results.length, 1);
  assert.equal(results[0].availabilityPercent, 50);
  assert.equal(results[0].availableSpots, null);
});

test('preserves a street price range instead of inventing one rate', () => {
  const [result] = getCuratedNearbyParkingSpots({
    origin: ORIGIN,
    spots: [
      spot({ id: 'price-a', streetCorridorKey: 'Preisstr.', minPrice: 2, avgPrice: 2 }),
      spot({ id: 'price-b', streetCorridorKey: 'Preisstraße', minPrice: 4, avgPrice: 4 }),
    ],
  });

  assert.equal(result.minPrice, 2);
  assert.equal(result.maxPrice, 4);
  assert.equal(formatParkingPriceLabel(result), 'EUR 2.00–4.00/hr');
});

test('does not merge a same-name street in a distant geographic component', () => {
  const results = getCuratedNearbyParkingSpots({
    origin: ORIGIN,
    spots: [
      spot({ id: 'local', streetCorridorKey: 'Ringstr.' }),
      spot({
        id: 'distant',
        latitude: latitudeMetersNorth(700),
        streetCorridorKey: 'Ringstraße',
      }),
    ],
  });

  assert.equal(results.length, 2);
});

test('one grouped street feeds one bubble and one colored road line', () => {
  const firstPath = [
    { latitude: ORIGIN.latitude, longitude: ORIGIN.longitude },
    { latitude: latitudeMetersNorth(120), longitude: ORIGIN.longitude },
  ];
  const parallelPath = firstPath.map((point) => ({
    latitude: point.latitude,
    longitude: point.longitude + 0.00004,
  }));
  const grouped = getCuratedNearbyParkingSpots({
    origin: ORIGIN,
    spots: [
      spot({
        id: 'corridor-a',
        colorStatus: 'red',
        streetCorridorKey: 'Einsteinstr.',
        lineGeometry: firstPath,
      }),
      spot({
        id: 'corridor-b',
        colorStatus: 'red',
        streetCorridorKey: 'Einsteinstraße',
        lineGeometry: parallelPath,
      }),
    ],
  });
  const markerItems = getDisplayedParkingMarkerItems([], null, grouped, false);
  const segments = buildStreetAvailabilitySegments(
    markerItems.map((item) => ({
      item,
      x: 100,
      y: 100,
      width: 44,
      height: 44,
      tier: 'small' as const,
    })),
    { activeSearchResults: true, mapHeight: 800, mapWidth: 400 },
  );

  assert.equal(grouped.length, 1);
  assert.equal(markerItems.length, 1);
  assert.equal(segments.length, 1);
  assert.equal(
    buildStreetAvailabilityPolylines(segments).filter(
      ({ id }) => !id.endsWith(':halo'),
    ).length,
    1,
  );
  assert.deepEqual(grouped[0].lineGeometry, firstPath);
});

test('prefers availability between equally close options', () => {
  const results = getCuratedNearbyParkingSpots({
    origin: ORIGIN,
    spots: [
      spot({
        id: 'low-availability',
        latitude: latitudeMetersNorth(100),
        availabilityPercent: 30,
      }),
      spot({
        id: 'high-availability',
        latitude: latitudeMetersNorth(120),
        availabilityPercent: 90,
      }),
    ],
  });
  assert.deepEqual(results.map((result) => result.id), [
    'high-availability',
    'low-availability',
  ]);
});

test('prefers free parking between equally close options', () => {
  const results = getCuratedNearbyParkingSpots({
    origin: ORIGIN,
    spots: [
      spot({ id: 'paid', latitude: latitudeMetersNorth(100) }),
      spot({
        id: 'free',
        latitude: latitudeMetersNorth(110),
        minPrice: null,
        avgPrice: null,
        pricingStatus: 'free',
      }),
    ],
  });
  assert.deepEqual(results.map((result) => result.id), ['free', 'paid']);
});

test('does not rank unknown pricing as free', () => {
  const results = getCuratedNearbyParkingSpots({
    origin: ORIGIN,
    spots: [
      spot({ id: 'paid', latitude: latitudeMetersNorth(110) }),
      spot({
        id: 'unknown',
        latitude: latitudeMetersNorth(100),
        minPrice: null,
        avgPrice: null,
        pricingStatus: 'unknown',
      }),
    ],
  });
  assert.deepEqual(results.map((result) => result.id), ['paid', 'unknown']);
});

test('does not mutate the input spots', () => {
  const input = spot({ id: 'a', latitude: latitudeMetersNorth(100) });
  const snapshot = structuredClone(input);
  getCuratedNearbyParkingSpots({ origin: ORIGIN, spots: [input] });
  assert.deepEqual(input, snapshot);
  assert.equal('distanceFromSearchMeters' in input, false);
});
