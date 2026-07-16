import assert from 'node:assert/strict';
import test from 'node:test';

import {
  normalizeParkingCellSummaryRow,
  normalizeParkingSegmentSummaryRow,
  normalizeParkingZoneSummaryRow,
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

test('complete zone summary normalization has no viewport input', () => {
  const row = {
    ...aggregateRow,
    zone_id: '7',
    zone_name: 'Altstadt',
    representative_latitude: 48.137,
    representative_longitude: 11.575,
  };
  const first = normalizeParkingZoneSummaryRow(row);
  const second = normalizeParkingZoneSummaryRow(structuredClone(row));
  assert.deepEqual(first, second);
  assert.equal(first?.stats.segmentCount, 12);
  assert.equal(first?.stats.totalCapacity, 240);
});

test('cell rows retain stable server IDs and parent zones', () => {
  const cell = normalizeParkingCellSummaryRow({
    ...aggregateRow,
    id: 'coarse:123:456',
    parent_zone_ids: ['7', '8'],
    center_latitude: 48.137,
    center_longitude: 11.575,
    min_lng: 11.57,
    min_lat: 48.13,
    max_lng: 11.58,
    max_lat: 48.14,
    resolution: 'coarse',
  });
  assert.equal(cell?.id, 'coarse:123:456');
  assert.deepEqual(cell?.parentZoneIds, ['7', '8']);
});

test('segment rows support unassigned segments and unknown values', () => {
  const segment = normalizeParkingSegmentSummaryRow({
    id: 'segment-1',
    parking_zone_id: null,
    street_name: 'Test Street',
    source_area_name: null,
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
  assert.equal(segment?.zoneId, null);
  assert.equal(segment?.capacity, null);
  assert.equal(segment?.availability.status, 'unknown');
  assert.equal(segment?.pricing.status, 'unknown');
});

test('normalizes UUID-derived summary IDs without changing their text value', () => {
  const uuid = '8c2a4d42-4f9c-4d26-8a85-0b1b5f3d2f10';
  const segment = normalizeParkingSegmentSummaryRow({
    id: uuid,
    parking_zone_id: 7,
    street_name: 'Test Street',
    source_area_name: 'Altstadt',
    lat: 48.137,
    lon: 11.575,
    capacity: 4,
    estimated_available_capacity: 2,
    estimated_availability_percent: 50,
    availability_status: 'estimated',
    pricing_status: 'paid',
    hourly_rate: 2.5,
    updated_at: '2026-07-16T10:00:00.000Z',
  });

  assert.equal(segment?.id, uuid);
  assert.equal(segment?.zoneId, '7');
  assert.equal(segment?.availability.status, 'estimated');
});

test('invalid service rows are rejected instead of fabricated', () => {
  assert.equal(normalizeParkingZoneSummaryRow({ ...aggregateRow }), null);
  assert.equal(
    normalizeParkingCellSummaryRow({ ...aggregateRow, id: 'bad' }),
    null,
  );
  assert.equal(
    normalizeParkingSegmentSummaryRow({ id: 'bad', lat: 200, lon: 11 }),
    null,
  );
});

test('stage cache exposes freshness without discarding stale usable data', () => {
  const cache = new ParkingMapDataCache(2);
  cache.set('zone', { count: 82 }, 1_000, 10_000);
  assert.equal(cache.get<{ count: number }>('zone', 10_500)?.isFresh, true);
  const stale = cache.get<{ count: number }>('zone', 11_001);
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
