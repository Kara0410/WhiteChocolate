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

test('percentage-only migration keeps unknown rows null without requiring a fake count', async () => {
  const migration = await readFile(
    resolve(
      dirname(fileURLToPath(import.meta.url)),
      '../supabase/migrations/20260719000100_allow_percentage_only_parking_estimates.sql',
    ),
    'utf8',
  );
  assert.match(
    migration,
    /status = 'estimated'[\s\S]*availability_percent is not null/,
  );
  assert.match(
    migration,
    /status = 'unknown'[\s\S]*availability_percent is null[\s\S]*available_spaces is null/,
  );
  assert.doesNotMatch(
    migration,
    /status = 'estimated'[\s\S]{0,120}available_spaces is not null/,
  );
});

test('pending migration chain preserves UUID joins and explicitly changes the view contract', async () => {
  const migrationDirectory = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '../supabase/migrations',
  );
  const [semanticZoom, reconciliation, estimator] = await Promise.all([
    readFile(
      resolve(migrationDirectory, '20260713000100_parking_semantic_zoom_backend.sql'),
      'utf8',
    ),
    readFile(
      resolve(migrationDirectory, '20260716000100_reconcile_parking_semantic_zoom_uuid.sql'),
      'utf8',
    ),
    readFile(
      resolve(migrationDirectory, '20260718000100_parking_availability_estimator.sql'),
      'utf8',
    ),
  ]);

  assert.match(semanticZoom, /hashtextextended\(segment\.id::text, 0\)/);
  assert.match(semanticZoom, /on segment\.id = assignment\.segment_id\b/);
  assert.doesNotMatch(semanticZoom, /assignment\.segment_id::text/);

  const dropFunction = reconciliation.indexOf('drop function public.fetch_parking_cells(');
  const dropZoneView = reconciliation.indexOf('drop view public.parking_zone_summaries;');
  const dropSegmentView = reconciliation.indexOf('drop view public.parking_segment_summaries;');
  const createSegmentView = reconciliation.indexOf('create view public.parking_segment_summaries');
  assert.ok(dropFunction >= 0 && dropFunction < dropZoneView);
  assert.ok(dropZoneView < dropSegmentView);
  assert.ok(dropSegmentView < createSegmentView);
  assert.match(reconciliation, /segment\.id::text as id/);
  assert.match(reconciliation, /segment\.id = assignment\.segment_id::text/);

  assert.match(
    estimator,
    /segment_id uuid not null references public\.parking_segments\(id\)/,
  );
  assert.match(estimator, /snapshot\.segment_id = segment\.id/);
  assert.match(estimator, /segment\.id = assignment\.segment_id/);
  assert.doesNotMatch(estimator, /segment_id::text|segment\.id = .*::text/);
});
