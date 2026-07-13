import assert from 'node:assert/strict';
import test from 'node:test';

import {
  combineSyncResults,
  createEmptySyncResult,
  createFailedSyncResult,
  createInitialDomainState,
  createSyncError,
} from '../src/services/sync/sync-results';

test('createEmptySyncResult starts successful with zeroed counters', () => {
  const result = createEmptySyncResult(
    'preferences',
    'local',
    '2026-07-03T10:00:00.000Z',
  );

  assert.deepEqual(result, {
    domain: 'preferences',
    success: true,
    source: 'local',
    uploaded: 0,
    downloaded: 0,
    merged: 0,
    skipped: 0,
    conflicts: 0,
    timestamp: '2026-07-03T10:00:00.000Z',
    error: null,
  });
});

test('createSyncError only carries a cause when one is given', () => {
  const plain = createSyncError('NETWORK_FAILED', 'Offline.');
  assert.deepEqual(plain, { code: 'NETWORK_FAILED', message: 'Offline.' });
  assert.equal('cause' in plain, false);

  const caused = createSyncError('UPLOAD_FAILED', 'Nope.', 'boom');
  assert.equal(caused.cause, 'boom');
});

test('createFailedSyncResult is unsuccessful and keeps the error', () => {
  const error = createSyncError('DOWNLOAD_FAILED', 'Nope.');
  const result = createFailedSyncResult('favorites', error);

  assert.equal(result.success, false);
  assert.equal(result.error, error);
  assert.equal(result.domain, 'favorites');
  assert.equal(result.uploaded, 0);
});

test('createInitialDomainState is idle and local-only', () => {
  assert.deepEqual(createInitialDomainState('preferences'), {
    domain: 'preferences',
    status: 'idle',
    strategy: 'localOnly',
    lastSyncedAt: null,
    pendingLocalCount: 0,
    pendingRemoteCount: 0,
    error: null,
  });
});

test('combining no results yields an empty aggregate', () => {
  const combined = combineSyncResults([]);

  assert.equal(combined.domain, 'all');
  assert.equal(combined.success, true);
  assert.equal(combined.source, 'merged');
});

test('combining successful results sums counters and takes the newest timestamp', () => {
  const combined = combineSyncResults([
    {
      ...createEmptySyncResult('preferences', 'local', '2026-07-03T10:00:00.000Z'),
      uploaded: 2,
      conflicts: 1,
    },
    {
      ...createEmptySyncResult('favorites', 'remote', '2026-07-03T11:00:00.000Z'),
      downloaded: 3,
      merged: 1,
    },
  ]);

  assert.equal(combined.success, true);
  assert.equal(combined.uploaded, 2);
  assert.equal(combined.downloaded, 3);
  assert.equal(combined.merged, 1);
  assert.equal(combined.conflicts, 1);
  assert.equal(combined.timestamp, '2026-07-03T11:00:00.000Z');
  assert.equal(combined.error, null);
});

test('a partial failure is reported and never counts as success', () => {
  const failure = createFailedSyncResult(
    'favorites',
    createSyncError('UPLOAD_FAILED', 'Nope.'),
  );
  const combined = combineSyncResults([
    createEmptySyncResult('preferences'),
    failure,
  ]);

  assert.equal(combined.success, false);
  assert.equal(combined.error?.code, 'PARTIAL_FAILURE');
});

test('when everything fails the first error is surfaced', () => {
  const first = createSyncError('NETWORK_FAILED', 'Offline.');
  const combined = combineSyncResults([
    createFailedSyncResult('preferences', first),
    createFailedSyncResult('favorites', createSyncError('UNKNOWN', 'Other.')),
  ]);

  assert.equal(combined.success, false);
  assert.equal(combined.error, first);
});
