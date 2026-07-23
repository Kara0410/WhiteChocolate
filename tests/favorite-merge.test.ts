import assert from 'node:assert/strict';
import test from 'node:test';

import { mergeFavorites } from '../src/services/sync/favorite-merge';
import type { ParkingClusterResponse } from '../src/types/parking-map';
import { deepFreeze } from './helpers/deep-freeze';

function favorite(
  id: string,
  extra: Partial<ParkingClusterResponse> = {},
): ParkingClusterResponse {
  return {
    id,
    type: 'spot',
    latitude: 48.137,
    longitude: 11.575,
    availabilityPercent: 60,
    count: 1,
    totalCapacity: 20,
    availableSpots: 12,
    colorStatus: 'green',
    minPrice: 2.5,
    avgPrice: 3,
    bestSpot: {
      id: `${id}-best`,
      label: 'Altstadt',
      availableSpots: 12,
      availabilityPercent: 60,
      pricePerHour: 2.5,
    },
    ...extra,
  };
}

function remoteRow(
  snapshot: unknown,
  segmentId: string,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: `row-${segmentId}`,
    user_id: 'user-1',
    segment_id: segmentId,
    snapshot,
    created_at: '2026-07-01T00:00:00.000Z',
    updated_at: '2026-07-02T00:00:00.000Z',
    ...overrides,
  };
}

test('local only: everything becomes an upload candidate', () => {
  const local = [favorite('a'), favorite('b')];
  const result = mergeFavorites(local, []);

  assert.deepEqual(result.favorites, local);
  assert.deepEqual(result.uploadedCandidates, local);
  assert.deepEqual(result.downloadedCandidates, []);
  assert.equal(result.mergedCount, 0);
  assert.deepEqual(result.conflicts, []);
});

test('remote only: snapshots are materialized and downloaded', () => {
  const stored = favorite('a');
  const result = mergeFavorites([], [remoteRow(stored, 'a')]);

  assert.deepEqual(result.favorites, [stored]);
  assert.deepEqual(result.downloadedCandidates, [stored]);
  assert.deepEqual(result.uploadedCandidates, []);
});

test('distinct ids union with local order first', () => {
  const local = [favorite('a')];
  const remote = favorite('b');
  const result = mergeFavorites(local, [remoteRow(remote, 'b')]);

  assert.deepEqual(
    result.favorites.map(({ id }) => id),
    ['a', 'b'],
  );
  assert.equal(result.mergedCount, 0);
});

test('same id with identical content is not a conflict', () => {
  const local = favorite('a');
  // Postgres jsonb reorders keys; the comparison must not care.
  const reordered = Object.fromEntries(
    Object.entries(favorite('a')).reverse(),
  );
  const result = mergeFavorites([local], [remoteRow(reordered, 'a')]);

  assert.equal(result.favorites.length, 1);
  assert.equal(result.favorites[0], local);
  assert.equal(result.mergedCount, 1);
  assert.deepEqual(result.conflicts, []);
  assert.deepEqual(result.uploadedCandidates, []);
});

test('same id with differing content: local wins and re-uploads', () => {
  const local = favorite('a', { availableSpots: 3 });
  const remote = favorite('a', { availableSpots: 12 });
  const result = mergeFavorites([local], [remoteRow(remote, 'a')]);

  assert.deepEqual(result.favorites, [local]);
  assert.deepEqual(result.conflicts, [
    { domain: 'favorites', key: 'a', winner: 'local' },
  ]);
  assert.deepEqual(result.uploadedCandidates, [local]);
});

test('malformed remote rows are dropped', () => {
  const valid = favorite('ok');
  const result = mergeFavorites(
    [],
    [
      null,
      'not-a-row',
      remoteRow(null, 'no-snapshot'),
      remoteRow({ id: 'broken' }, 'broken'),
      remoteRow(favorite('empty-key'), ''),
      remoteRow(valid, 'ok'),
    ],
  );

  assert.deepEqual(result.favorites, [valid]);
});

test('the row segment_id wins over the snapshot id', () => {
  const snapshot = favorite('stale-id');
  const result = mergeFavorites([], [remoteRow(snapshot, 'seg-9')]);

  assert.equal(result.favorites.length, 1);
  assert.equal(result.favorites[0].id, 'seg-9');
  // Everything else from the snapshot is preserved.
  assert.deepEqual(result.favorites[0].bestSpot, snapshot.bestSpot);
});

test('duplicate remote segment ids keep the first row', () => {
  const first = favorite('a', { availableSpots: 1 });
  const second = favorite('a', { availableSpots: 2 });
  const result = mergeFavorites(
    [],
    [remoteRow(first, 'a'), remoteRow(second, 'a')],
  );

  assert.equal(result.favorites.length, 1);
  assert.equal(result.favorites[0].availableSpots, 1);
});

test('inputs are not mutated', () => {
  const local = deepFreeze([favorite('a'), favorite('b')]);
  const remote = deepFreeze([
    remoteRow(favorite('a', { availableSpots: 1 }), 'a'),
    remoteRow(favorite('c'), 'c'),
  ]);

  // Frozen inputs throw on any mutation attempt in strict mode.
  const result = mergeFavorites(local, remote);
  assert.equal(result.favorites.length, 3);
});
