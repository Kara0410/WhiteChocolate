import assert from 'node:assert/strict';
import test from 'node:test';

import type { Vehicle } from '../src/types/vehicle';
import {
  clearStoredVehicles,
  EMPTY_VEHICLE_STATE,
  loadStoredVehicleState,
  normalizeStoredVehicleState,
  saveVehicleState,
  VEHICLES_STORAGE_KEY,
} from '../src/utils/vehicle-storage';
import { createMemoryStorage } from './helpers/memory-storage';

function vehicle(id: string, licensePlate = `M AB ${id.toUpperCase()}`): Vehicle {
  return {
    id,
    nickname: `Car ${id}`,
    licensePlate,
    createdAt: '2026-07-03T00:00:00.000Z',
  };
}

test('returns an empty garage for missing or malformed stored state', () => {
  assert.deepEqual(normalizeStoredVehicleState(null), EMPTY_VEHICLE_STATE);
  assert.deepEqual(normalizeStoredVehicleState('nope'), EMPTY_VEHICLE_STATE);
  assert.deepEqual(normalizeStoredVehicleState([]), EMPTY_VEHICLE_STATE);
  assert.deepEqual(
    normalizeStoredVehicleState({ activeVehicleId: 'one', vehicles: 'bad' }),
    EMPTY_VEHICLE_STATE,
  );
});

test('keeps valid vehicles and drops malformed entries', () => {
  const result = normalizeStoredVehicleState({
    activeVehicleId: 'one',
    vehicles: [
      { ...vehicle('one'), nickname: '  Family car ', licensePlate: ' m ab 1 ' },
      'not-a-vehicle',
      { ...vehicle('missing-nickname'), nickname: '   ' },
      { ...vehicle('missing-plate'), licensePlate: '' },
      { ...vehicle('bad-created-at'), createdAt: 123 },
      { ...vehicle('two'), updatedAt: '2026-07-03T01:00:00.000Z' },
    ],
  });

  assert.deepEqual(
    result.vehicles.map(({ id }) => id),
    ['one', 'two'],
  );
  assert.equal(result.vehicles[0].nickname, 'Family car');
  assert.equal(result.vehicles[0].licensePlate, 'M AB 1');
  assert.equal(result.vehicles[1].updatedAt, '2026-07-03T01:00:00.000Z');
  assert.equal(result.activeVehicleId, 'one');
});

test('drops duplicate ids and duplicate license plates', () => {
  const result = normalizeStoredVehicleState({
    activeVehicleId: null,
    vehicles: [
      vehicle('one', 'M AB 1'),
      vehicle('one', 'M CD 2'),
      vehicle('two', ' m  ab 1 '),
      vehicle('three', 'M EF 3'),
    ],
  });

  assert.deepEqual(
    result.vehicles.map(({ id }) => id),
    ['one', 'three'],
  );
});

test('restores the active vehicle and falls back safely', () => {
  const stored = { vehicles: [vehicle('one'), vehicle('two')] };

  assert.equal(
    normalizeStoredVehicleState({ ...stored, activeVehicleId: 'two' })
      .activeVehicleId,
    'two',
  );
  assert.equal(
    normalizeStoredVehicleState({ ...stored, activeVehicleId: 'unknown' })
      .activeVehicleId,
    'one',
  );
  assert.equal(
    normalizeStoredVehicleState({ activeVehicleId: 'one', vehicles: [] })
      .activeVehicleId,
    null,
  );
});

test('saves and loads a garage round trip', async () => {
  const storage = createMemoryStorage();
  const state = {
    activeVehicleId: 'two',
    vehicles: [vehicle('one'), vehicle('two')],
  };

  await saveVehicleState(state, storage);
  assert.deepEqual(await loadStoredVehicleState(storage), state);
});

test('loading corrupted JSON falls back to an empty garage', async () => {
  const storage = createMemoryStorage();
  storage.data.set(VEHICLES_STORAGE_KEY, '{not valid json');

  assert.deepEqual(await loadStoredVehicleState(storage), EMPTY_VEHICLE_STATE);
});

test('loading with no stored value returns an empty garage', async () => {
  const storage = createMemoryStorage();

  assert.deepEqual(await loadStoredVehicleState(storage), EMPTY_VEHICLE_STATE);
});

test('saving an empty garage removes the stored key', async () => {
  const storage = createMemoryStorage();

  await saveVehicleState(
    { activeVehicleId: 'one', vehicles: [vehicle('one')] },
    storage,
  );
  assert.equal(storage.data.has(VEHICLES_STORAGE_KEY), true);

  await saveVehicleState(EMPTY_VEHICLE_STATE, storage);
  assert.equal(storage.data.has(VEHICLES_STORAGE_KEY), false);
});

test('clearStoredVehicles removes the stored key', async () => {
  const storage = createMemoryStorage();

  await saveVehicleState(
    { activeVehicleId: 'one', vehicles: [vehicle('one')] },
    storage,
  );
  await clearStoredVehicles(storage);

  assert.equal(storage.data.has(VEHICLES_STORAGE_KEY), false);
  assert.deepEqual(await loadStoredVehicleState(storage), EMPTY_VEHICLE_STATE);
});
