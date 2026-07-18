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
