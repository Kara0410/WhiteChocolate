import assert from 'node:assert/strict';
import test from 'node:test';

import {
  parkingSegmentFromRow,
  parkingSegmentToMapRecord,
} from '../src/utils/parking-segments';
import { parkingRecordToResponse } from '../src/services/parking-clustering';
import type { ParkingSegmentRow } from '../src/types/database';

function row(overrides: Partial<ParkingSegmentRow> = {}): ParkingSegmentRow {
  return {
    FID: 'segment.1',
    angebot: 12,
    created_at: '2026-06-30T00:00:00.000Z',
    geoportal_class: 'Bewohnerparken',
    id: 'segment-id',
    lat: 48.13,
    lon: 11.58,
    parkregel_beschreibung: 'Bewohnerparken 9-23 Uhr',
    parkregel_gruppe: 'Bewohnerparken',
    parkregel_id: 8,
    parkregel_name: 'Bew 9-23',
    prm_name: 'Südliche Au',
    shape: 'LINESTRING (691000 5333000, 691100 5333100)',
    strasse: 'Teststr.',
    updated_at: '2026-06-30T00:00:00.000Z',
    ...overrides,
  };
}

test('maps Supabase columns to strict app fields', () => {
  const segment = parkingSegmentFromRow(row());

  assert.deepEqual(segment, {
    id: 'segment-id',
    street: 'Teststr.',
    capacity: 12,
    description: 'Bewohnerparken 9-23 Uhr',
    groupName: 'Bewohnerparken',
    parkregelName: 'Bew 9-23',
    prmName: 'Südliche Au',
    geoportalClass: 'Bewohnerparken',
    shape: 'LINESTRING (691000 5333000, 691100 5333100)',
    lat: 48.13,
    lon: 11.58,
  });
});

test('rejects missing or invalid coordinates', () => {
  assert.equal(parkingSegmentFromRow(row({ lat: null })), null);
  assert.equal(parkingSegmentFromRow(row({ lon: null })), null);
  assert.equal(parkingSegmentFromRow(row({ lat: 91 })), null);
  assert.equal(parkingSegmentFromRow(row({ lon: Number.NaN })), null);
});

test('keeps null and zero capacity distinct and handles missing streets', () => {
  const nullCapacity = parkingSegmentFromRow(
    row({ angebot: null, prm_name: null, strasse: null }),
  );
  const zeroCapacity = parkingSegmentFromRow(row({ angebot: 0 }));

  assert.equal(nullCapacity?.capacity, null);
  assert.equal(
    nullCapacity && parkingSegmentToMapRecord(nullCapacity).zoneName,
    'Unnamed parking segment',
  );
  assert.equal(zeroCapacity?.capacity, 0);
  assert.equal(
    zeroCapacity && parkingSegmentToMapRecord(zeroCapacity).availabilityPercent,
    0,
  );
});

test('preserves UUID identity for multiple segments on the same street', () => {
  const first = parkingSegmentFromRow(row({ id: 'first' }));
  const second = parkingSegmentFromRow(row({ id: 'second' }));

  assert.equal(first?.street, second?.street);
  assert.notEqual(first?.id, second?.id);
});

test('preserves segment identity and title through the marker model', () => {
  const segment = parkingSegmentFromRow(row());
  assert.ok(segment);

  const marker = parkingRecordToResponse(parkingSegmentToMapRecord(segment));

  assert.equal(marker.id, 'spot:segment-id');
  assert.equal(marker.bestSpot.id, 'segment-id');
  assert.equal(marker.bestSpot.zoneName, 'Südliche Au');
  assert.equal(marker.latitude, 48.13);
  assert.equal(marker.longitude, 11.58);
});
