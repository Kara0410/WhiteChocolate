import assert from 'node:assert/strict';
import test from 'node:test';

import type { ParkingSegmentSummary } from '../src/types/parking-domain';
import { aggregateParkingSegments } from '../src/utils/parking-domain';
import { availabilityFor, pricingFor } from '../src/utils/parking-segments';

function segment(
  id: string,
  overrides: Partial<ParkingSegmentSummary> = {},
): ParkingSegmentSummary {
  return {
    id,
    zoneId: 'zone-1',
    streetName: 'Test Street',
    sourceAreaName: null,
    coordinates: { latitude: 48.13, longitude: 11.58 },
    capacity: 10,
    pricing: {
      status: 'paid',
      currency: 'EUR',
      hourlyRate: 2,
      dailyRate: null,
    },
    availability: {
      status: 'estimated',
      availableSpaces: 5,
      totalSpaces: 10,
      percent: 50,
      confidence: 'medium',
      generatedAt: '2026-07-13T10:00:00.000Z',
      validUntil: '2026-07-13T10:15:00.000Z',
      factors: [],
    },
    updatedAt: null,
    ...overrides,
  };
}

test('unknown capacity stays unknown and is not estimated as zero', () => {
  const availability = availabilityFor(null);
  assert.equal(availability.status, 'unknown');
  assert.equal(availability.totalSpaces, null);
  assert.equal(availability.availableSpaces, null);
  assert.equal(availability.percent, null);
});

test('pricing distinguishes unknown, explicit free, and paid euros', () => {
  assert.deepEqual(pricingFor('Other', null, null), {
    status: 'unknown',
    currency: 'EUR',
  });
  assert.deepEqual(pricingFor(null, null, 'Gebührenfrei'), {
    status: 'free',
    currency: 'EUR',
  });
  assert.deepEqual(pricingFor('Mischparken 9-23', null, null), {
    status: 'paid',
    currency: 'EUR',
    hourlyRate: 2,
    dailyRate: null,
  });
});

test('inventory fallback never fabricates availability from an ID', () => {
  const availability = availabilityFor(12);
  assert.equal(availability.status, 'unknown');
  assert.equal(availability.percent, null);
});

test('aggregate availability is capacity weighted', () => {
  const stats = aggregateParkingSegments([
    segment('small', {
      capacity: 10,
      availability: {
        status: 'estimated',
        availableSpaces: 10,
        totalSpaces: 10,
        percent: 100,
        confidence: 'medium',
        generatedAt: '2026-07-13T10:00:00.000Z',
        validUntil: '2026-07-13T10:15:00.000Z',
        factors: [],
      },
    }),
    segment('large', {
      capacity: 90,
      availability: {
        status: 'estimated',
        availableSpaces: 0,
        totalSpaces: 90,
        percent: 0,
        confidence: 'medium',
        generatedAt: '2026-07-13T10:00:00.000Z',
        validUntil: '2026-07-13T10:15:00.000Z',
        factors: [],
      },
    }),
  ]);
  assert.equal(stats.availabilityPercent, 10);
  assert.equal(stats.segmentCount, 2);
  assert.equal(stats.totalCapacity, 100);
});

test('percentage-only estimates use an unweighted fallback when no capacity exists', () => {
  const stats = aggregateParkingSegments([
    segment('first', {
      capacity: null,
      availability: {
        status: 'estimated',
        availableSpaces: null,
        totalSpaces: null,
        percent: 12,
        confidence: 'low',
        generatedAt: '2026-07-13T10:00:00.000Z',
        validUntil: '2026-07-13T10:15:00.000Z',
        factors: [],
      },
    }),
    segment('second', {
      capacity: null,
      availability: {
        status: 'estimated',
        availableSpaces: null,
        totalSpaces: null,
        percent: 20,
        confidence: 'low',
        generatedAt: '2026-07-13T10:00:00.000Z',
        validUntil: '2026-07-13T10:15:00.000Z',
        factors: [],
      },
    }),
  ]);
  assert.equal(stats.totalCapacity, null);
  assert.equal(stats.availableCapacity, null);
  assert.equal(stats.availabilityPercent, 16);
  assert.equal(stats.availabilityStatus, 'estimated');
});

test('record count and physical capacity remain separate', () => {
  const stats = aggregateParkingSegments([
    segment('known', { capacity: 20 }),
    segment('unknown', {
      capacity: null,
      availability: {
        status: 'unknown',
        availableSpaces: null,
        totalSpaces: null,
        percent: null,
        confidence: null,
        generatedAt: null,
        validUntil: null,
        factors: [],
      },
    }),
  ]);
  assert.equal(stats.segmentCount, 2);
  assert.equal(stats.totalCapacity, 20);
  assert.equal(stats.availabilityStatus, 'mixed');
});

test('unknown availability is excluded from the weighted percentage', () => {
  const stats = aggregateParkingSegments([
    segment('known', {
      capacity: 10,
      availability: {
        status: 'estimated',
        availableSpaces: 5,
        totalSpaces: 10,
        percent: 50,
        confidence: 'medium',
        generatedAt: '2026-07-13T10:00:00.000Z',
        validUntil: '2026-07-13T10:15:00.000Z',
        factors: [],
      },
    }),
    segment('unknown', {
      capacity: 90,
      availability: {
        status: 'unknown',
        availableSpaces: null,
        totalSpaces: 90,
        percent: null,
        confidence: null,
        generatedAt: null,
        validUntil: null,
        factors: [],
      },
    }),
  ]);
  assert.equal(stats.totalCapacity, 100);
  assert.equal(stats.availableCapacity, 5);
  assert.equal(stats.availabilityPercent, 50);
});
