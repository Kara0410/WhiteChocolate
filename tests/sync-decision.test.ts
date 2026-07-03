import assert from 'node:assert/strict';
import test from 'node:test';

import { determineSyncStrategy } from '../src/services/sync/sync-decision';

test('anonymous users stay local-only regardless of data', () => {
  assert.equal(
    determineSyncStrategy({
      isAuthenticated: false,
      localCount: 0,
      remoteCount: 0,
    }),
    'localOnly',
  );
  assert.equal(
    determineSyncStrategy({
      isAuthenticated: false,
      localCount: 3,
      remoteCount: 5,
    }),
    'localOnly',
  );
});

test('nothing on either side needs no action', () => {
  assert.equal(
    determineSyncStrategy({
      isAuthenticated: true,
      localCount: 0,
      remoteCount: 0,
    }),
    'noAction',
  );
});

test('local data with an empty account uploads', () => {
  assert.equal(
    determineSyncStrategy({
      isAuthenticated: true,
      localCount: 2,
      remoteCount: 0,
    }),
    'localUpload',
  );
});

test('remote data with an empty device restores', () => {
  assert.equal(
    determineSyncStrategy({
      isAuthenticated: true,
      localCount: 0,
      remoteCount: 4,
    }),
    'remoteRestore',
  );
});

test('data on both sides merges', () => {
  assert.equal(
    determineSyncStrategy({
      isAuthenticated: true,
      localCount: 2,
      remoteCount: 4,
    }),
    'merge',
  );
});

test('dismissing the prompt keeps this session local-only', () => {
  assert.equal(
    determineSyncStrategy({
      isAuthenticated: true,
      localCount: 2,
      remoteCount: 4,
      dismissedThisSession: true,
    }),
    'localOnly',
  );
  assert.equal(
    determineSyncStrategy({
      isAuthenticated: true,
      localCount: 2,
      remoteCount: 0,
      dismissedThisSession: true,
    }),
    'localOnly',
  );
});

test('dismissing with nothing to sync stays noAction', () => {
  assert.equal(
    determineSyncStrategy({
      isAuthenticated: true,
      localCount: 0,
      remoteCount: 0,
      dismissedThisSession: true,
    }),
    'noAction',
  );
});

test('explicitly unchanged sides need no action', () => {
  assert.equal(
    determineSyncStrategy({
      isAuthenticated: true,
      localCount: 2,
      remoteCount: 2,
      hasLocalChanges: false,
      hasRemoteChanges: false,
    }),
    'noAction',
  );
});

test('a single change flag falls through to the count rules', () => {
  assert.equal(
    determineSyncStrategy({
      isAuthenticated: true,
      localCount: 2,
      remoteCount: 2,
      hasLocalChanges: false,
    }),
    'merge',
  );
  assert.equal(
    determineSyncStrategy({
      isAuthenticated: true,
      localCount: 2,
      remoteCount: 2,
      hasLocalChanges: true,
      hasRemoteChanges: false,
    }),
    'merge',
  );
});

test('negative counts are clamped to zero', () => {
  assert.equal(
    determineSyncStrategy({
      isAuthenticated: true,
      localCount: -1,
      remoteCount: -3,
    }),
    'noAction',
  );
  assert.equal(
    determineSyncStrategy({
      isAuthenticated: true,
      localCount: 2,
      remoteCount: -1,
    }),
    'localUpload',
  );
});
