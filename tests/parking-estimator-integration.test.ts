import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { resolveParkingDemandContext } from '../supabase/functions/_shared/parking-demand-context';
import { PARKING_ESTIMATOR_VERSION } from '../supabase/functions/_shared/parking-estimator';
import { parseEstimateParkingAvailabilityRequest } from '../supabase/functions/_shared/parking-estimator-request';
import { partitionParkingSnapshots } from '../supabase/functions/_shared/parking-snapshot-cache';

const request = {
  bounds: { minLat: 48.13, minLng: 11.57, maxLat: 48.14, maxLng: 11.58 },
  destination: { latitude: 48.137, longitude: 11.575, placeId: 'place-1' },
  origin: null,
  requestedAt: '2026-07-18T10:00:00.000Z',
  timezone: 'Europe/Berlin',
  includeTraffic: false,
} as const;

test('Edge Function request validation rejects invalid and oversized bounds', () => {
  assert.throws(
    () => parseEstimateParkingAvailabilityRequest({ ...request, bounds: { ...request.bounds, minLat: 100 } }),
    /bounds are invalid/,
  );
  assert.throws(
    () => parseEstimateParkingAvailabilityRequest({ ...request, bounds: { minLat: 48, minLng: 11, maxLat: 49, maxLng: 12 } }),
    /too large/,
  );
});

test('Google timeout falls back to empty static demand context', async () => {
  const timeoutFetch = async () => {
    throw new DOMException('timed out', 'AbortError');
  };
  const context = await resolveParkingDemandContext(
    parseEstimateParkingAvailabilityRequest(request),
    'server-key',
    timeoutFetch,
  );
  assert.equal(context.placeStatus, 'timeout');
  assert.equal(context.nearbyStatus, 'timeout');
  assert.equal(context.destinationCategory, 'unknown');
  assert.equal(context.destinationIsOpen, null);
});

test('valid snapshots are reused and expired snapshots are regenerated', () => {
  const now = new Date('2026-07-18T10:00:00Z');
  const snapshots = [
    {
      segment_id: 'valid',
      estimator_version: PARKING_ESTIMATOR_VERSION,
      generated_at: '2026-07-18T09:55:00Z',
      valid_until: '2026-07-18T10:10:00Z',
    },
    {
      segment_id: 'expired',
      estimator_version: PARKING_ESTIMATOR_VERSION,
      generated_at: '2026-07-18T09:30:00Z',
      valid_until: '2026-07-18T09:45:00Z',
    },
  ];
  const partition = partitionParkingSnapshots(
    ['valid', 'expired', 'missing'],
    snapshots,
    PARKING_ESTIMATOR_VERSION,
    now,
  );
  assert.deepEqual([...partition.reusableBySegment.keys()], ['valid']);
  assert.deepEqual(partition.missingSegmentIds, ['expired', 'missing']);
});

test('migration has snapshot selection, weighted coverage, and no hash fallback', async () => {
  const migration = await readFile(
    resolve(
      dirname(fileURLToPath(import.meta.url)),
      '../supabase/migrations/20260718000100_parking_availability_estimator.sql',
    ),
    'utf8',
  );
  assert.match(migration, /parking_availability_estimates/);
  assert.match(migration, /snapshot\.valid_until > now\(\)/);
  assert.match(migration, /estimate_coverage_ratio/);
  assert.match(migration, /estimated_capacity/);
  assert.doesNotMatch(migration, /hashtextextended|mod\s*\(\s*hash/i);
});
