import assert from 'node:assert/strict';
import test from 'node:test';

import {
  estimateParkingAvailability,
  getParkingTimeBucket,
  mapGoogleTypesToDemandCategory,
  type ParkingEstimateInput,
} from '../supabase/functions/_shared/parking-estimator';

function input(overrides: Partial<ParkingEstimateInput> = {}): ParkingEstimateInput {
  return {
    segmentId: 'segment-1',
    capacity: 100,
    regulationGroup: 'Mischparken',
    regulationName: 'Paid parking',
    regulationDescription: null,
    pricingStatus: 'paid',
    hourlyRate: 2,
    localDateTime: new Date('2026-07-20T05:00:00.000Z'),
    generatedAt: new Date('2026-07-20T05:00:00.000Z'),
    destinationDistanceMeters: 300,
    destinationPrimaryType: 'store',
    destinationTypes: ['store'],
    destinationIsOpen: true,
    destinationRatingCount: 300,
    nearbyPoiCount: 12,
    trafficRatio: 1,
    precipitationIntensity: null,
    ...overrides,
  };
}

test('maps Google types into isolated parking demand categories', () => {
  assert.equal(mapGoogleTypesToDemandCategory('bar', []), 'nightlife');
  assert.equal(mapGoogleTypesToDemandCategory('hospital', []), 'healthcare');
  assert.equal(mapGoogleTypesToDemandCategory(null, ['train_station']), 'transit');
  assert.equal(mapGoogleTypesToDemandCategory('unrelated_type', []), 'unknown');
});

test('uses Europe/Berlin time buckets at their documented boundaries', () => {
  assert.equal(getParkingTimeBucket(new Date('2026-01-12T05:00:00Z')), 'morning-peak');
  assert.equal(getParkingTimeBucket(new Date('2026-01-12T08:30:00Z')), 'daytime');
  assert.equal(getParkingTimeBucket(new Date('2026-07-12T21:00:00Z')), 'late-night');
});

test('weekday morning peak is more occupied than Sunday early morning', () => {
  const weekday = estimateParkingAvailability(
    input({ localDateTime: new Date('2026-01-12T07:00:00Z') }),
  );
  const sunday = estimateParkingAvailability(
    input({ localDateTime: new Date('2026-01-11T03:00:00Z') }),
  );
  assert.ok(weekday.availabilityPercent! < sunday.availabilityPercent!);
});

test('Friday evening nightlife raises demand relative to daytime retail', () => {
  const nightlife = estimateParkingAvailability(
    input({
      localDateTime: new Date('2026-07-17T19:00:00Z'),
      destinationPrimaryType: 'night_club',
      destinationTypes: ['night_club'],
    }),
  );
  const retail = estimateParkingAvailability(
    input({
      localDateTime: new Date('2026-07-17T11:00:00Z'),
      destinationPrimaryType: 'store',
      destinationTypes: ['store'],
    }),
  );
  assert.ok(nightlife.availabilityPercent! < retail.availabilityPercent!);
});

test('open destinations, high POI density, and congestion each raise demand', () => {
  const baseline = estimateParkingAvailability(
    input({ destinationIsOpen: false, nearbyPoiCount: 2, trafficRatio: 1 }),
  );
  const open = estimateParkingAvailability(
    input({ destinationIsOpen: true, nearbyPoiCount: 2, trafficRatio: 1 }),
  );
  const dense = estimateParkingAvailability(
    input({ destinationIsOpen: false, nearbyPoiCount: 35, trafficRatio: 1 }),
  );
  const congested = estimateParkingAvailability(
    input({ destinationIsOpen: false, nearbyPoiCount: 2, trafficRatio: 1.6 }),
  );
  assert.ok(open.availabilityPercent! < baseline.availabilityPercent!);
  assert.ok(dense.availabilityPercent! < baseline.availabilityPercent!);
  assert.ok(congested.availabilityPercent! < baseline.availabilityPercent!);
});

test('missing Google context remains a deterministic low-confidence estimate', () => {
  const estimate = estimateParkingAvailability(
    input({
      destinationPrimaryType: null,
      destinationTypes: [],
      destinationIsOpen: null,
      destinationRatingCount: null,
      nearbyPoiCount: null,
      trafficRatio: null,
    }),
  );
  assert.equal(estimate.status, 'estimated');
  assert.equal(estimate.confidence, 'low');
  assert.notEqual(estimate.availabilityPercent, null);
});

test('known rules and a Google demand signal produce medium confidence only', () => {
  const estimate = estimateParkingAvailability(input());
  assert.equal(estimate.confidence, 'medium');
  assert.notEqual(estimate.confidence, 'high');
});

test('missing capacity receives a pessimistic percentage-only estimate', () => {
  for (const capacity of [null, 2.5]) {
    const estimate = estimateParkingAvailability(input({ capacity }));
    assert.equal(estimate.status, 'estimated');
    assert.equal(estimate.confidence, 'low');
    assert.ok(estimate.availabilityPercent! >= 0);
    assert.equal(estimate.availableSpaces, null);
    assert.ok(
      estimate.factors.some(
        (item) => item.code === 'capacity-unknown-conservative',
      ),
    );
  }
});

test('zero capacity and restricted parking are conservatively unavailable', () => {
  for (const capacity of [0, -1]) {
    const estimate = estimateParkingAvailability(input({ capacity }));
    assert.equal(estimate.status, 'estimated');
    assert.equal(estimate.availabilityPercent, 0);
    assert.equal(estimate.availableSpaces, capacity === 0 ? 0 : null);
  }
  for (const regulationDescription of [
    'Nur mit Bewohnerausweis',
    'Behindertenparken',
    'Carsharing Stellplatz',
    'Absolutes Halteverbot 0-24 Uhr',
  ]) {
    const restricted = estimateParkingAvailability(
      input({ regulationDescription }),
    );
    assert.equal(restricted.status, 'estimated');
    assert.equal(restricted.availabilityPercent, 0);
    assert.equal(restricted.availableSpaces, 0);
  }
});

test('small-capacity estimates round available spaces conservatively downward', () => {
  const estimate = estimateParkingAvailability(
    input({
      capacity: 3,
      destinationIsOpen: null,
      destinationRatingCount: null,
      nearbyPoiCount: null,
      trafficRatio: null,
    }),
  );
  assert.equal(estimate.availableSpaces, Math.floor(3 * estimate.availabilityPercent! / 100));
  assert.ok(estimate.availableSpaces! >= 0 && estimate.availableSpaces! <= 3);
});

test('occupancy and available spaces are clamped conservatively', () => {
  const estimate = estimateParkingAvailability(
    input({
      capacity: 100,
      localDateTime: new Date('2026-07-17T19:00:00Z'),
      pricingStatus: 'free',
      destinationDistanceMeters: 50,
      destinationPrimaryType: 'night_club',
      destinationTypes: ['night_club'],
      destinationIsOpen: true,
      destinationRatingCount: 5_000,
      nearbyPoiCount: 40,
      trafficRatio: 2,
    }),
  );
  assert.equal(estimate.availabilityPercent, 2);
  assert.equal(estimate.availableSpaces, 2);
});

test('identical inputs are deterministic while time-bucket changes affect output', () => {
  const first = estimateParkingAvailability(input());
  const second = estimateParkingAvailability(input());
  assert.deepEqual(first, second);
  const overnight = estimateParkingAvailability(
    input({ localDateTime: new Date('2026-07-20T02:00:00Z') }),
  );
  assert.notEqual(first.availabilityPercent, overnight.availabilityPercent);
});
