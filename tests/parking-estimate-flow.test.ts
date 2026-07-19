import assert from 'node:assert/strict';
import test from 'node:test';

import { parkingSegmentToMapFeature } from '../src/services/parking-feature-clustering';
import type { ParkingSegmentSummary } from '../src/types/parking-domain';
import { parkingMapFeatureToLegacyResponse } from '../src/utils/parking-feature-adapters';
import { mergeParkingAvailabilityEstimates } from '../src/utils/parking-estimates';

function inventorySegment(): ParkingSegmentSummary {
  return {
    id: 'segment-1',
    zoneId: '7',
    streetName: 'Test Street',
    sourceAreaName: 'Altstadt',
    coordinates: { latitude: 48.137, longitude: 11.575 },
    capacity: 20,
    pricing: {
      status: 'paid',
      currency: 'EUR',
      hourlyRate: 2.5,
      dailyRate: null,
    },
    availability: {
      status: 'unknown',
      availableSpaces: null,
      totalSpaces: 20,
      percent: null,
      confidence: null,
      generatedAt: null,
      validUntil: null,
      factors: [],
    },
    updatedAt: '2026-07-18T09:00:00Z',
  };
}

test('destination estimate reaches marker/detail compatibility data with metadata', () => {
  const [segment] = mergeParkingAvailabilityEstimates(
    [inventorySegment()],
    [
      {
        segmentId: 'segment-1',
        availableSpaces: 6,
        availabilityPercent: 30,
        status: 'estimated',
        confidence: 'medium',
        generatedAt: '2026-07-18T10:00:00Z',
        validUntil: '2026-07-18T10:15:00Z',
        estimatorVersion: 'heuristic-v1',
        factors: [
          {
            code: 'destination-retail',
            impact: 'increases-demand',
            weight: 0.05,
          },
        ],
      },
    ],
  );
  const marker = parkingMapFeatureToLegacyResponse(
    parkingSegmentToMapFeature(segment),
  );
  assert.ok(marker);
  assert.equal(marker.availabilityPercent, 30);
  assert.equal(marker.availableSpots, 6);
  assert.equal(marker.availabilityStatus, 'estimated');
  assert.equal(marker.availabilityConfidence, 'medium');
  assert.equal(marker.estimateGeneratedAt, '2026-07-18T10:00:00Z');
  assert.equal(marker.estimatorVersion, 'heuristic-v1');
});

test('unknown availability stays null and uses a neutral marker state', () => {
  const marker = parkingMapFeatureToLegacyResponse(
    parkingSegmentToMapFeature(inventorySegment()),
  );
  assert.ok(marker);
  assert.equal(marker.availabilityPercent, null);
  assert.equal(marker.availableSpots, null);
  assert.equal(marker.colorStatus, 'neutral');
  assert.equal(marker.availabilityStatus, 'unknown');
});

test('an estimated zero remains distinct from unknown availability', () => {
  const [segment] = mergeParkingAvailabilityEstimates(
    [inventorySegment()],
    [{
      segmentId: 'segment-1',
      availableSpaces: 0,
      availabilityPercent: 0,
      status: 'estimated',
      confidence: 'medium',
      generatedAt: '2026-07-18T10:00:00Z',
      validUntil: '2026-07-18T10:15:00Z',
      estimatorVersion: 'heuristic-v1',
      factors: [],
    }],
  );
  assert.equal(segment.availability.status, 'estimated');
  assert.equal(segment.availability.percent, 0);
  assert.equal(segment.availability.availableSpaces, 0);
});

test('a percentage-only estimate remains visible when capacity is unavailable', () => {
  const [segment] = mergeParkingAvailabilityEstimates(
    [{ ...inventorySegment(), capacity: null }],
    [{
      segmentId: 'segment-1',
      availableSpaces: null,
      availabilityPercent: 18,
      status: 'estimated',
      confidence: 'low',
      generatedAt: '2026-07-18T10:00:00Z',
      validUntil: '2026-07-18T10:15:00Z',
      estimatorVersion: 'heuristic-v2.1-pessimistic',
      factors: [],
    }],
  );
  assert.equal(segment.availability.status, 'estimated');
  assert.equal(segment.availability.percent, 18);
  assert.equal(segment.availability.availableSpaces, null);
  assert.equal(segment.availability.totalSpaces, null);
  assert.equal(
    segment.availability.estimatorVersion,
    'heuristic-v2.1-pessimistic',
  );

  const marker = parkingMapFeatureToLegacyResponse(
    parkingSegmentToMapFeature(segment),
  );
  assert.equal(marker?.availabilityPercent, 18);
  assert.equal(marker?.availableSpots, null);
});

test('a context merge clears estimates that are missing from that context', () => {
  const [segment] = mergeParkingAvailabilityEstimates(
    [{
      ...inventorySegment(),
      availability: {
        status: 'estimated',
        availableSpaces: 4,
        totalSpaces: 20,
        percent: 20,
        confidence: 'medium',
        generatedAt: '2026-07-18T10:00:00Z',
        validUntil: '2026-07-18T10:15:00Z',
        factors: [],
      },
    }],
    [],
    { unknownWhenMissing: true },
  );
  assert.equal(segment.availability.status, 'unknown');
  assert.equal(segment.availability.percent, null);
  assert.equal(segment.availability.availableSpaces, null);
});
