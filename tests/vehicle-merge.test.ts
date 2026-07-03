import assert from 'node:assert/strict';
import test from 'node:test';

import { mergeVehicles } from '../src/services/sync/vehicle-merge';
import type { Vehicle } from '../src/types/vehicle';
import { deepFreeze } from './helpers/deep-freeze';

function vehicle(
  id: string,
  licensePlate: string,
  extra: Partial<Vehicle> = {},
): Vehicle {
  return {
    id,
    nickname: `Car ${id}`,
    licensePlate,
    createdAt: '2026-07-01T00:00:00.000Z',
    ...extra,
  };
}

function remoteRow(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: 'remote-uuid-1',
    user_id: 'user-1',
    nickname: 'Remote car',
    license_plate: 'M RE 1',
    license_plate_normalized: 'M RE 1',
    is_active: false,
    local_created_at: '2026-06-30T00:00:00.000Z',
    created_at: '2026-07-01T12:00:00.000Z',
    updated_at: '2026-07-02T00:00:00.000Z',
    ...overrides,
  };
}

test('local only: everything becomes an upload candidate', () => {
  const local = [vehicle('one', 'M AB 1'), vehicle('two', 'M CD 2')];
  const result = mergeVehicles(local, [], { activeVehicleId: 'two' });

  assert.deepEqual(result.vehicles, local);
  assert.deepEqual(result.uploadedCandidates, local);
  assert.deepEqual(result.downloadedCandidates, []);
  assert.equal(result.mergedCount, 0);
  assert.deepEqual(result.conflicts, []);
  assert.equal(result.activeVehicleId, 'two');
});

test('remote only: rows are mapped to local vehicles and downloaded', () => {
  const result = mergeVehicles(
    [],
    [
      remoteRow({ id: 'r1', license_plate: 'm re 1', is_active: false }),
      remoteRow({ id: 'r2', license_plate: 'M RE 2', is_active: true }),
    ],
    { activeVehicleId: null },
  );

  assert.deepEqual(
    result.vehicles.map(({ id }) => id),
    ['r1', 'r2'],
  );
  assert.equal(result.vehicles[0].licensePlate, 'M RE 1');
  assert.equal(result.vehicles[0].nickname, 'Remote car');
  assert.equal(result.vehicles[0].createdAt, '2026-06-30T00:00:00.000Z');
  assert.equal(result.vehicles[0].updatedAt, '2026-07-02T00:00:00.000Z');
  assert.equal(result.downloadedCandidates.length, 2);
  assert.deepEqual(result.uploadedCandidates, []);
  // The remote is_active flag picks the active vehicle.
  assert.equal(result.activeVehicleId, 'r2');
});

test('remote only without an active flag falls back to the first vehicle', () => {
  const result = mergeVehicles(
    [],
    [remoteRow({ id: 'r1' })],
  );

  assert.equal(result.activeVehicleId, 'r1');
});

test('distinct plates union with local order first', () => {
  const local = [vehicle('one', 'M AB 1')];
  const result = mergeVehicles(
    local,
    [remoteRow({ id: 'r1', license_plate: 'M RE 1' })],
    { activeVehicleId: 'one' },
  );

  assert.deepEqual(
    result.vehicles.map(({ id }) => id),
    ['one', 'r1'],
  );
  assert.deepEqual(result.uploadedCandidates.map(({ id }) => id), ['one']);
  assert.deepEqual(result.downloadedCandidates.map(({ id }) => id), ['r1']);
  assert.equal(result.mergedCount, 0);
  assert.equal(result.activeVehicleId, 'one');
});

test('same plate with identical content keeps the local instance', () => {
  const local = [
    vehicle('one', 'M AB 1', { nickname: 'Family car' }),
  ];
  const result = mergeVehicles(
    local,
    [
      remoteRow({
        id: 'r1',
        nickname: 'Family car',
        license_plate: ' m  ab 1 ',
      }),
    ],
    { activeVehicleId: 'one' },
  );

  assert.deepEqual(result.vehicles, local);
  assert.equal(result.mergedCount, 1);
  assert.deepEqual(result.conflicts, []);
  assert.deepEqual(result.uploadedCandidates, []);
  assert.equal(result.activeVehicleId, 'one');
});

test('conflicting nickname: newer remote wins and the active id follows', () => {
  const local = [
    vehicle('one', 'M AB 1', {
      nickname: 'Old name',
      updatedAt: '2026-07-01T00:00:00.000Z',
    }),
  ];
  const result = mergeVehicles(
    local,
    [
      remoteRow({
        id: 'r1',
        nickname: 'New name',
        license_plate: 'M AB 1',
        updated_at: '2026-07-03T00:00:00.000Z',
      }),
    ],
    { activeVehicleId: 'one' },
  );

  assert.equal(result.vehicles.length, 1);
  assert.equal(result.vehicles[0].id, 'r1');
  assert.equal(result.vehicles[0].nickname, 'New name');
  assert.deepEqual(result.conflicts, [
    { domain: 'vehicles', key: 'M AB 1', winner: 'remote' },
  ]);
  assert.deepEqual(result.uploadedCandidates, []);
  // The active vehicle survives the merge under its new id.
  assert.equal(result.activeVehicleId, 'r1');
});

test('conflicting nickname without a local timestamp: local wins', () => {
  const local = [vehicle('one', 'M AB 1', { nickname: 'Local name' })];
  const result = mergeVehicles(
    local,
    [
      remoteRow({
        id: 'r1',
        nickname: 'Remote name',
        license_plate: 'M AB 1',
        updated_at: '2026-07-03T00:00:00.000Z',
      }),
    ],
    { activeVehicleId: 'one' },
  );

  assert.equal(result.vehicles[0].id, 'one');
  assert.equal(result.vehicles[0].nickname, 'Local name');
  assert.deepEqual(result.conflicts, [
    { domain: 'vehicles', key: 'M AB 1', winner: 'local' },
  ]);
  assert.deepEqual(result.uploadedCandidates.map(({ id }) => id), ['one']);
});

test('conflicting nickname with a newer local timestamp: local wins', () => {
  const local = [
    vehicle('one', 'M AB 1', {
      nickname: 'Local name',
      updatedAt: '2026-07-03T00:00:00.000Z',
    }),
  ];
  const result = mergeVehicles(local, [
    remoteRow({
      id: 'r1',
      nickname: 'Remote name',
      license_plate: 'M AB 1',
      updated_at: '2026-07-02T00:00:00.000Z',
    }),
  ]);

  assert.equal(result.vehicles[0].id, 'one');
  assert.deepEqual(result.conflicts, [
    { domain: 'vehicles', key: 'M AB 1', winner: 'local' },
  ]);
});

test('malformed remote rows are dropped', () => {
  const result = mergeVehicles(
    [],
    [
      null,
      'not-a-row',
      {},
      remoteRow({ id: 'r1', nickname: '   ' }),
      remoteRow({ id: 'r2', license_plate: '' }),
      remoteRow({ id: 'r3', local_created_at: null, created_at: 42 }),
      remoteRow({ id: 'ok' }),
    ],
  );

  assert.deepEqual(
    result.vehicles.map(({ id }) => id),
    ['ok'],
  );
});

test('duplicate remote plates keep the first row', () => {
  const result = mergeVehicles(
    [],
    [
      remoteRow({ id: 'r1', license_plate: 'M RE 1' }),
      remoteRow({ id: 'r2', license_plate: ' m re 1 ' }),
    ],
  );

  assert.deepEqual(
    result.vehicles.map(({ id }) => id),
    ['r1'],
  );
});

test('an unknown active id is repaired to the first vehicle', () => {
  const local = [vehicle('one', 'M AB 1')];
  const result = mergeVehicles(local, [], { activeVehicleId: 'ghost' });

  assert.equal(result.activeVehicleId, 'one');
});

test('empty inputs produce an empty result with null active id', () => {
  const result = mergeVehicles([], []);

  assert.deepEqual(result.vehicles, []);
  assert.equal(result.activeVehicleId, null);
});

test('inputs are not mutated', () => {
  const local = deepFreeze([
    vehicle('one', 'M AB 1'),
    vehicle('two', 'M CD 2'),
  ]);
  const remote = deepFreeze([
    remoteRow({ id: 'r1', license_plate: 'M AB 1', nickname: 'Different' }),
    remoteRow({ id: 'r2', license_plate: 'M RE 9' }),
  ]);

  // Frozen inputs throw on any mutation attempt in strict mode.
  const result = mergeVehicles(local, remote, { activeVehicleId: 'one' });
  assert.equal(result.vehicles.length, 3);
});
