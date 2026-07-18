import assert from 'node:assert/strict';
import test from 'node:test';

import type { ParkingSegmentRow } from '../src/types/database';
import {
  getParkingSegmentPageRange,
  parkingSegmentFromRow,
} from '../src/utils/parking-segments';

test('paginates through the Supabase row cap and requests overflow', () => {
  assert.deepEqual(getParkingSegmentPageRange(0, 2_001, 1_000), {
    from: 0,
    to: 999,
  });
  assert.deepEqual(getParkingSegmentPageRange(1_000, 2_001, 1_000), {
    from: 1_000,
    to: 1_999,
  });
  assert.deepEqual(getParkingSegmentPageRange(2_000, 2_001, 1_000), {
    from: 2_000,
    to: 2_000,
  });
  assert.equal(getParkingSegmentPageRange(2_001, 2_001, 1_000), null);
});

function row(overrides: Partial<ParkingSegmentRow> = {}): ParkingSegmentRow {
  return {
    FID: 'segment.1',
    angebot: 12,
    created_at: '2026-06-30T00:00:00.000Z',
    geoportal_class: 'Bewohnerparken',
    id: 'segment-id',
    lat: 48.13,
    location: null,
    lon: 11.58,
    parking_zone_id: null,
    parkregel_beschreibung: 'Bewohnerparken 9-23 Uhr',
    parkregel_gruppe: 'Bewohnerparken',
    parkregel_id: 8,
    parkregel_name: 'Bew 9-23',
    prm_name: 'Southern Au',
    shape: 'LINESTRING (691000 5333000, 691100 5333100)',
    strasse: 'Teststr.',
    updated_at: '2026-06-30T00:00:00.000Z',
    ...overrides,
  };
}

test('maps Supabase columns to explicit domain fields', () => {
  const segment = parkingSegmentFromRow(row());
  assert.ok(segment);
  assert.equal(segment.id, 'segment-id');
  assert.equal(segment.streetName, 'Teststr.');
  assert.equal(segment.sourceAreaName, 'Southern Au');
  assert.equal(segment.capacity, 12);
  assert.deepEqual(segment.coordinates, {
    latitude: 48.13,
    longitude: 11.58,
  });
  assert.equal(segment.pricing.status, 'unknown');
  assert.equal(segment.availability.status, 'unknown');
  assert.equal(segment.regulation.name, 'Bew 9-23');
  assert.equal(segment.updatedAt, '2026-06-30T00:00:00.000Z');
});

test('preserves UUID-shaped segment IDs as string domain identifiers', () => {
  const uuid = '8c2a4d42-4f9c-4d26-8a85-0b1b5f3d2f10';
  const segment = parkingSegmentFromRow(row({ id: uuid }));

  assert.ok(segment);
  assert.equal(segment.id, uuid);
  assert.equal(segment.availability.status, 'unknown');
});

test('rejects missing or invalid coordinates', () => {
  assert.equal(parkingSegmentFromRow(row({ id: '' })), null);
  assert.equal(parkingSegmentFromRow(row({ lat: null })), null);
  assert.equal(parkingSegmentFromRow(row({ lon: null })), null);
  assert.equal(parkingSegmentFromRow(row({ lat: 91 })), null);
  assert.equal(parkingSegmentFromRow(row({ lon: Number.NaN })), null);
});

test('keeps null and zero capacity distinct', () => {
  const unknown = parkingSegmentFromRow(
    row({ angebot: null, prm_name: null, strasse: null }),
  );
  const zero = parkingSegmentFromRow(row({ angebot: 0 }));
  assert.equal(unknown?.capacity, null);
  assert.equal(unknown?.availability.status, 'unknown');
  assert.equal(zero?.capacity, 0);
  assert.equal(zero?.availability.status, 'unknown');
});

test('preserves stable identity for segments on the same street', () => {
  const first = parkingSegmentFromRow(row({ id: 'first' }));
  const second = parkingSegmentFromRow(row({ id: 'second' }));
  assert.equal(first?.streetName, second?.streetName);
  assert.notEqual(first?.id, second?.id);
});
