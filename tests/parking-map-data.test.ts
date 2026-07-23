import assert from 'node:assert/strict';
import test from 'node:test';

import {
  normalizeParkingCellSummaryRow,
  normalizeParkingSegmentSummaryRow,
} from '../src/utils/parking-map-data-normalizers';
import { ParkingMapDataCache } from '../src/utils/parking-map-data-cache';

const aggregateRow = {
  segment_count: 12,
  total_capacity: 240,
  available_capacity: 120,
  availability_percent: 50,
  minimum_hourly_rate: 1.5,
  maximum_hourly_rate: 3,
  has_free_parking: true,
  has_unknown_pricing: true,
  availability_status: 'estimated',
  updated_at: '2026-07-13T10:00:00.000Z',
};

test('cell rows retain stable server IDs without ownership metadata', () => {
  const cell = normalizeParkingCellSummaryRow({
    ...aggregateRow,
    id: 'coarse:123:456',
    center_latitude: 48.137,
    center_longitude: 11.575,
    min_lng: 11.57,
    min_lat: 48.13,
    max_lng: 11.58,
    max_lat: 48.14,
    resolution: 'coarse',
  });
  assert.equal(cell?.id, 'coarse:123:456');
  assert.equal('parentZoneIds' in (cell ?? {}), false);
});

test('segment rows preserve city and source metadata', () => {
  const segment = normalizeParkingSegmentSummaryRow({
    id: 'segment-1',
    city_code: 'vienna',
    source_record_id: 'source-1',
    street_name: 'Test Street',
    source_area_name: 'District source label',
    source_classification: 'street-parking',
    source_geometry: 'LINESTRING (0 0, 1 1)',
    lat: 48.137,
    lon: 11.575,
    capacity: null,
    estimated_available_capacity: null,
    estimated_availability_percent: null,
    availability_status: 'unknown',
    pricing_status: 'unknown',
    hourly_rate: null,
    updated_at: null,
  });
  assert.equal(segment?.cityCode, 'vienna');
  assert.equal(segment?.sourceRecordId, 'source-1');
  assert.equal(segment?.sourceAreaName, 'District source label');
  assert.equal('zoneId' in (segment ?? {}), false);
  assert.equal(segment?.availability.status, 'unknown');
});

test('normalizes UUID IDs and current availability without changing identity', () => {
  const uuid = '8c2a4d42-4f9c-4d26-8a85-0b1b5f3d2f10';
  const segment = normalizeParkingSegmentSummaryRow({
    id: uuid,
    city_code: 'munich',
    street_name: 'Test Street',
    source_area_name: 'Raw source label',
    lat: 48.137,
    lon: 11.575,
    capacity: 4,
    estimated_available_capacity: 2,
    estimated_availability_percent: 50,
    availability_status: 'estimated',
    availability_confidence: 'medium',
    estimate_generated_at: '2026-07-16T10:00:00.000Z',
    estimate_valid_until: '2026-07-16T10:15:00.000Z',
    estimate_factors: [],
    pricing_status: 'paid',
    hourly_rate: 2.5,
    updated_at: '2026-07-16T10:00:00.000Z',
  });
  assert.equal(segment?.id, uuid);
  assert.equal(segment?.availability.status, 'estimated');
});

test('normalizes a percentage-only estimate without fabricating counts', () => {
  const segment = normalizeParkingSegmentSummaryRow({
    id: '8c2a4d42-4f9c-4d26-8a85-0b1b5f3d2f10',
    city_code: 'zurich',
    street_name: 'Test Street',
    source_area_name: null,
    lat: 47.3769,
    lon: 8.5417,
    capacity: null,
    estimated_available_capacity: null,
    estimated_availability_percent: 18,
    availability_status: 'estimated',
    availability_confidence: 'low',
    estimate_generated_at: '2026-07-19T10:00:00.000Z',
    estimate_valid_until: '2026-07-19T10:15:00.000Z',
    estimator_version: 'heuristic-v2.1-pessimistic',
    estimate_factors: [],
    pricing_status: 'unknown',
    hourly_rate: null,
    updated_at: null,
  });
  assert.equal(segment?.availability.status, 'estimated');
  assert.equal(segment?.availability.percent, 18);
  assert.equal(segment?.availability.availableSpaces, null);
  assert.equal(segment?.availability.totalSpaces, null);
});

test('invalid service rows are rejected instead of fabricated', () => {
  assert.equal(normalizeParkingCellSummaryRow({ ...aggregateRow, id: 'bad' }), null);
  assert.equal(
    normalizeParkingSegmentSummaryRow({
      id: 'bad',
      city_code: 'munich',
      lat: 200,
      lon: 11,
    }),
    null,
  );
});

test('stage cache exposes freshness without discarding stale usable data', () => {
  const cache = new ParkingMapDataCache(2);
  cache.set('city', { count: 82 }, 1_000, 10_000);
  assert.equal(cache.get<{ count: number }>('city', 10_500)?.isFresh, true);
  const stale = cache.get<{ count: number }>('city', 11_001);
  assert.equal(stale?.isFresh, false);
  assert.equal(stale?.value.count, 82);
});

test('stage cache is bounded and evicts the least recently used entry', () => {
  const cache = new ParkingMapDataCache(2);
  cache.set('a', 1, 1_000, 0);
  cache.set('b', 2, 1_000, 0);
  cache.get('a', 1);
  cache.set('c', 3, 1_000, 1);
  assert.equal(cache.get('b', 1), null);
  assert.equal(cache.get('a', 1)?.value, 1);
  assert.equal(cache.get('c', 1)?.value, 3);
});
