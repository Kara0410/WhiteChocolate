import assert from 'node:assert/strict';
import test from 'node:test';

import type { ParkingClusterResponse } from '../src/types/parking-map';
import { getCuratedNearbyParkingSpots } from '../src/utils/parkingSearch';

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
    minPrice: 2,
    avgPrice: 2,
    pricingStatus: 'paid',
    bestSpot: {
      id: overrides.id,
      zoneName: overrides.zoneName ?? 'Zone A',
      availableSpots: 5,
      availabilityPercent: 50,
      pricePerHour: 2,
    },
    zoneId: 'zone-a',
    zoneName: 'Zone A',
    ...overrides,
  };
}

test('returns nothing for an invalid origin', () => {
  const results = getCuratedNearbyParkingSpots({
    origin: { latitude: Number.NaN, longitude: 11.575 },
    spots: [spot({ id: 'a' })],
  });

  assert.deepEqual(results, []);
});

test('sorts by distance and respects the limit', () => {
  const results = getCuratedNearbyParkingSpots({
    origin: ORIGIN,
    spots: [
      spot({
        id: 'far',
        latitude: latitudeMetersNorth(500),
        zoneId: 'zone-b',
      }),
      spot({ id: 'near', latitude: latitudeMetersNorth(100) }),
      spot({
        id: 'farthest',
        latitude: latitudeMetersNorth(1000),
        zoneId: 'zone-c',
      }),
    ],
    limit: 2,
  });

  assert.deepEqual(
    results.map((result) => result.id),
    ['near', 'far'],
  );
  assert.equal(results[0].distanceFromSearchMeters, 100);
});

test('collapses same-zone spots within the duplicate radius', () => {
  const results = getCuratedNearbyParkingSpots({
    origin: ORIGIN,
    spots: [
      spot({ id: 'segment-a', latitude: latitudeMetersNorth(100) }),
      spot({ id: 'segment-b', latitude: latitudeMetersNorth(110) }),
      spot({
        id: 'other-zone',
        latitude: latitudeMetersNorth(400),
        zoneId: 'zone-b',
      }),
    ],
  });

  assert.deepEqual(
    results.map((result) => result.id),
    ['segment-a', 'other-zone'],
  );
});

test('keeps close spots from different zones as separate options', () => {
  const results = getCuratedNearbyParkingSpots({
    origin: ORIGIN,
    spots: [
      spot({ id: 'zone-a-spot', latitude: latitudeMetersNorth(100) }),
      spot({
        id: 'zone-b-spot',
        latitude: latitudeMetersNorth(110),
        zoneId: 'zone-b',
        zoneName: 'Zone B',
      }),
    ],
  });

  assert.equal(results.length, 2);
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
        zoneId: 'zone-b',
      }),
    ],
  });

  assert.deepEqual(
    results.map((result) => result.id),
    ['high-availability', 'low-availability'],
  );
});

test('prefers free parking between equally close, equally available options', () => {
  const results = getCuratedNearbyParkingSpots({
    origin: ORIGIN,
    spots: [
      spot({ id: 'paid', latitude: latitudeMetersNorth(100) }),
      spot({
        id: 'free',
        latitude: latitudeMetersNorth(110),
        zoneId: 'zone-b',
        minPrice: null,
        avgPrice: null,
        pricingStatus: 'free',
      }),
    ],
  });

  assert.deepEqual(
    results.map((result) => result.id),
    ['free', 'paid'],
  );
});

test('does not rank unknown pricing as free', () => {
  const results = getCuratedNearbyParkingSpots({
    origin: ORIGIN,
    spots: [
      spot({ id: 'paid', latitude: latitudeMetersNorth(110) }),
      spot({
        id: 'unknown',
        latitude: latitudeMetersNorth(100),
        zoneId: 'zone-b',
        minPrice: null,
        avgPrice: null,
        pricingStatus: 'unknown',
      }),
    ],
  });

  assert.deepEqual(
    results.map((result) => result.id),
    ['paid', 'unknown'],
  );
});

test('keeps duplicates when grouping is disabled', () => {
  const results = getCuratedNearbyParkingSpots({
    origin: ORIGIN,
    spots: [
      spot({ id: 'segment-a', latitude: latitudeMetersNorth(100) }),
      spot({ id: 'segment-b', latitude: latitudeMetersNorth(110) }),
    ],
    groupDuplicates: false,
  });

  assert.equal(results.length, 2);
});

test('does not mutate the input spots', () => {
  const input = spot({ id: 'a', latitude: latitudeMetersNorth(100) });
  const snapshot = structuredClone(input);

  getCuratedNearbyParkingSpots({ origin: ORIGIN, spots: [input] });

  assert.deepEqual(input, snapshot);
  assert.equal('distanceFromSearchMeters' in input, false);
});
