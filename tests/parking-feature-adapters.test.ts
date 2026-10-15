import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EMPTY_PARKING_AGGREGATE_STATS,
  type ParkingAggregateStats,
  type ParkingMapFeature,
  type ParkingSegmentSummary,
} from '../src/types/parking-domain';
import { parkingMapFeatureToResponse } from '../src/utils/parking-feature-adapters';

function stats(availabilityPercent: number | null): ParkingAggregateStats {
  return {
    ...EMPTY_PARKING_AGGREGATE_STATS,
    segmentCount: 1,
    availabilityPercent,
    availabilityStatus: availabilityPercent === null ? 'unknown' : 'estimated',
    totalCapacity: 10,
    availableCapacity: availabilityPercent === null ? null : 5,
  };
}

function segment(sourceGeometry: string | null): ParkingSegmentSummary {
  return {
    id: 'segment-1',
    cityCode: 'munich',
    sourceRecordId: 'segment.1',
    streetName: 'Teststr.',
    sourceAreaName: null,
    sourceClassification: null,
    sourceGeometry,
    coordinates: { latitude: 48.13, longitude: 11.58 },
    capacity: 10,
    pricing: { status: 'unknown', currency: 'EUR' },
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
    updatedAt: null,
  };
}

function clusterFeature(availabilityPercent: number | null): ParkingMapFeature {
  return {
    id: 'cluster-1',
    kind: 'segment-cluster',
    coordinates: { latitude: 48.13, longitude: 11.58 },
    stats: stats(availabilityPercent),
    expansionZoom: 16,
  };
}

function segmentFeature(
  availabilityPercent: number | null,
  sourceGeometry: string | null = null,
): ParkingMapFeature {
  return {
    id: 'segment-1',
    kind: 'segment',
    coordinates: { latitude: 48.13, longitude: 11.58 },
    stats: stats(availabilityPercent),
    segment: segment(sourceGeometry),
  };
}

test('colorStatus uses the canonical 66/33 threshold, not the old 60/30 drift', () => {
  // 65 is the exact regression case: the old `>= 60` logic would have returned 'green' here;
  // the canonical 66/33 threshold correctly returns 'orange'.
  assert.equal(parkingMapFeatureToResponse(clusterFeature(65))?.colorStatus, 'orange');
  assert.equal(parkingMapFeatureToResponse(clusterFeature(70))?.colorStatus, 'green');
  assert.equal(parkingMapFeatureToResponse(clusterFeature(40))?.colorStatus, 'orange');
  assert.equal(parkingMapFeatureToResponse(clusterFeature(20))?.colorStatus, 'red');
  assert.equal(parkingMapFeatureToResponse(clusterFeature(null))?.colorStatus, 'neutral');
});

test('lineGeometry is populated for a segment feature with valid source geometry', () => {
  const response = parkingMapFeatureToResponse(
    segmentFeature(50, 'LINESTRING (691000 5333000, 691100 5333100)'),
  );
  if (response === null) {
    throw new Error('expected a response');
  }
  assert.ok(response.lineGeometry !== null);
  assert.equal(response.lineGeometry?.length, 2);
  assert.equal(response.streetCorridorKey, 'Teststr.');
});

test('lineGeometry is null for a segment feature with missing source geometry', () => {
  const response = parkingMapFeatureToResponse(segmentFeature(50, null));
  if (response === null) {
    throw new Error('expected a response');
  }
  assert.equal(response.lineGeometry, null);
});

test('lineGeometry is always null for segment-cluster features', () => {
  const response = parkingMapFeatureToResponse(clusterFeature(50));
  if (response === null) {
    throw new Error('expected a response');
  }
  assert.equal(response.lineGeometry, null);
});
