import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeAppError } from '../src/utils/app-errors';

test('place search configuration errors never expose key setup details', () => {
  const normalized = normalizeAppError(
    new Error('EXPO_PUBLIC_GOOGLE_PLACES_API_KEY is blocked by Android Maps SDK restrictions'),
    'place-search',
  );

  assert.equal(normalized.message, 'Search is temporarily unavailable.');
  assert.equal(normalized.message.includes('EXPO_PUBLIC'), false);
  assert.equal(normalized.message.includes('API key'), false);
});

test('place search network failures use a retryable safe message', () => {
  const normalized = normalizeAppError(new TypeError('Network request failed'), 'place-search');

  assert.equal(normalized.code, 'NETWORK_ERROR');
  assert.equal(normalized.retryable, true);
  assert.equal(
    normalized.message,
    'Search is unavailable right now. Check your connection and try again.',
  );
});

test('parking failures use a safe message', () => {
  const normalized = normalizeAppError(
    new Error('PostgREST relation parking_segments does not exist'),
    'parking-data',
  );

  assert.equal(normalized.code, 'PARKING_DATA_FAILED');
  assert.equal(normalized.message, "Parking information couldn't be loaded. Try again.");
  assert.equal(normalized.message.includes('parking_segments'), false);
});

test('aborted requests are silent and non-retryable', () => {
  const normalized = normalizeAppError(
    Object.assign(new Error('The request was aborted'), { name: 'AbortError' }),
    'place-search',
  );

  assert.equal(normalized.code, 'CANCELLED');
  assert.equal(normalized.message, '');
  assert.equal(normalized.retryable, false);
});
