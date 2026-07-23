import assert from 'node:assert/strict';
import test from 'node:test';
import {
  batchParkingEstimatorValues,
  PARKING_ESTIMATOR_DATABASE_BATCH_SIZE,
} from '../supabase/functions/_shared/parking-estimator-batches';

import { buildParkingCellRpcCall } from '../src/utils/parking-cell-rpc';
import {
  buildParkingEstimatorRequest,
  LatestParkingEstimatorRequest,
  ParkingEstimatorRequestCoordinator,
  parkingEstimatorRequestKey,
  parkingEstimatorUserMessage,
} from '../src/utils/parking-estimator-request';

const bounds = {
  minLat: 48.1361,
  minLng: 11.5781,
  maxLat: 48.1379,
  maxLng: 11.5799,
};

test('builds the camelCase estimator request with stable time and timezone', () => {
  const requestedAt = new Date('2026-07-19T10:00:00.000Z');
  const first = buildParkingEstimatorRequest({
    bounds,
    destination: {
      latitude: 48.137,
      longitude: 11.579,
      placeId: '  real-place-id  ',
    },
    origin: null,
    includeTraffic: true,
    requestedAt,
  });
  const second = buildParkingEstimatorRequest({
    bounds,
    destination: first.destination!,
    origin: null,
    includeTraffic: true,
    requestedAt,
  });

  assert.deepEqual(first.bounds, {
    minLat: 48.136,
    minLng: 11.578,
    maxLat: 48.138,
    maxLng: 11.58,
  });
  assert.equal(first.destination?.placeId, 'real-place-id');
  assert.equal(first.origin, null);
  assert.equal(first.includeTraffic, false);
  assert.equal(first.requestedAt, '2026-07-19T10:00:00.000Z');
  assert.equal(first.timezone, 'Europe/Berlin');
  assert.equal(parkingEstimatorRequestKey(first), parkingEstimatorRequestKey(second));
});

test('normalizes blank place IDs and enables traffic only with a valid origin', () => {
  const request = buildParkingEstimatorRequest({
    bounds,
    destination: { latitude: 48.137, longitude: 11.579, placeId: '   ' },
    origin: { latitude: 48.14, longitude: 11.58 },
    includeTraffic: true,
    requestedAt: new Date('2026-07-19T10:00:00.000Z'),
  });
  assert.equal(request.destination?.placeId, null);
  assert.deepEqual(request.origin, { latitude: 48.14, longitude: 11.58 });
  assert.equal(request.includeTraffic, true);
});

test('always builds the authoritative parking cell RPC arguments', () => {
  const context = buildParkingCellRpcCall({
    bounds,
    contextHash: ' context-hash ',
    resolution: 'fine',
  });
  const withoutContext = buildParkingCellRpcCall({
    bounds,
    contextHash: '  ',
    resolution: 'coarse',
  });
  assert.equal(context.arguments.p_context_hash, 'context-hash');
  assert.equal(withoutContext.arguments.p_context_hash, null);
});

test('estimator database requests are bounded below URL and payload limits', () => {
  const values = Array.from({ length: 500 }, (_, index) => `segment-${index}`);
  const batches = batchParkingEstimatorValues(values);

  assert.equal(PARKING_ESTIMATOR_DATABASE_BATCH_SIZE, 100);
  assert.deepEqual(
    batches.map((batch) => batch.length),
    [100, 100, 100, 100, 100],
  );
  assert.deepEqual(batches.flat(), values);
  assert.throws(
    () => batchParkingEstimatorValues(values, 0),
    /positive integer/,
  );
});

test('deduplicates identical in-flight requests and reuses the completed result', async () => {
  let resolveOperation!: (value: string) => void;
  let invocationCount = 0;
  const coordinator = new ParkingEstimatorRequestCoordinator<string>(30_000);
  const operation = () => {
    invocationCount += 1;
    return new Promise<string>((resolve) => {
      resolveOperation = resolve;
    });
  };
  const first = coordinator.run('same-context', operation);
  const second = coordinator.run('same-context', operation);
  assert.equal(invocationCount, 1);
  resolveOperation('context-hash');
  assert.equal(await first, 'context-hash');
  assert.equal(await second, 'context-hash');
  assert.equal(await coordinator.run('same-context', operation), 'context-hash');
  assert.equal(invocationCount, 1);
});

test('only the newest estimator request may update active context', () => {
  const latest = new LatestParkingEstimatorRequest();
  const first = latest.begin();
  const second = latest.begin();
  assert.equal(latest.isCurrent(first), false);
  assert.equal(latest.isCurrent(second), true);
  latest.invalidate();
  assert.equal(latest.isCurrent(second), false);
});

test('destination changes produce a new request key while identical input does not', () => {
  const common = {
    bounds,
    origin: null,
    requestedAt: new Date('2026-07-19T10:00:00.000Z'),
  };
  const first = buildParkingEstimatorRequest({
    ...common,
    destination: { latitude: 48.137, longitude: 11.579, placeId: 'place-a' },
  });
  const same = buildParkingEstimatorRequest({
    ...common,
    destination: { latitude: 48.137, longitude: 11.579, placeId: 'place-a' },
  });
  const changed = buildParkingEstimatorRequest({
    ...common,
    destination: { latitude: 48.138, longitude: 11.58, placeId: 'place-b' },
  });
  assert.equal(parkingEstimatorRequestKey(first), parkingEstimatorRequestKey(same));
  assert.notEqual(
    parkingEstimatorRequestKey(first),
    parkingEstimatorRequestKey(changed),
  );
});

test('backend failures map to concise user-safe messages', () => {
  assert.equal(
    parkingEstimatorUserMessage('server'),
    'Parking availability could not be updated right now.',
  );
  assert.equal(
    parkingEstimatorUserMessage('area-too-large'),
    'The selected area is too large. Zoom in and try again.',
  );
});
