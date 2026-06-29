import assert from 'node:assert/strict';
import test from 'node:test';

import type { Vehicle } from '../src/types/vehicle';
import {
  addVehicleToState,
  normalizeLicensePlate,
  removeVehicleFromState,
  setActiveVehicleInState,
  validateVehicleInput,
} from '../src/utils/vehicles';

function vehicle(id: string, licensePlate = `M ${id}`): Vehicle {
  return {
    id,
    nickname: `Car ${id}`,
    licensePlate,
    createdAt: '2026-06-29T00:00:00.000Z',
  };
}

test('normalizes license plate whitespace and casing', () => {
  assert.equal(normalizeLicensePlate('  m   ab 1234 '), 'M AB 1234');
});

test('requires a nickname and license plate', () => {
  const result = validateVehicleInput(
    { nickname: '   ', licensePlate: '' },
    [],
  );

  assert.equal(result.errors.nickname, 'Nickname is required.');
  assert.equal(result.errors.licensePlate, 'License plate is required.');
});

test('rejects duplicate license plates case-insensitively', () => {
  const result = validateVehicleInput(
    { nickname: 'Second car', licensePlate: 'm  ab 1234' },
    [vehicle('one', 'M AB 1234')],
  );

  assert.equal(
    result.errors.licensePlate,
    'This license plate is already in your garage.',
  );
});

test('accepts and normalizes a valid vehicle', () => {
  const result = validateVehicleInput(
    { nickname: '  Family car ', licensePlate: ' m  ab 1234 ' },
    [],
  );

  assert.deepEqual(result.errors, {});
  assert.deepEqual(result.value, {
    nickname: 'Family car',
    licensePlate: 'M AB 1234',
  });
});

test('adding the first vehicle makes it active and selecting changes it', () => {
  const one = vehicle('one');
  const two = vehicle('two');
  const firstState = addVehicleToState([], null, one);
  const secondState = addVehicleToState(
    firstState.vehicles,
    firstState.activeVehicleId,
    two,
  );

  assert.equal(firstState.activeVehicleId, 'one');
  assert.equal(secondState.activeVehicleId, 'one');
  assert.equal(
    setActiveVehicleInState(
      secondState.vehicles,
      secondState.activeVehicleId,
      'two',
    ),
    'two',
  );
});

test('deleting an inactive vehicle keeps the active vehicle', () => {
  const result = removeVehicleFromState(
    [vehicle('one'), vehicle('two')],
    'one',
    'two',
  );

  assert.deepEqual(result.vehicles.map(({ id }) => id), ['one']);
  assert.equal(result.activeVehicleId, 'one');
});

test('deleting the active vehicle selects another vehicle', () => {
  const result = removeVehicleFromState(
    [vehicle('one'), vehicle('two')],
    'one',
    'one',
  );

  assert.deepEqual(result.vehicles.map(({ id }) => id), ['two']);
  assert.equal(result.activeVehicleId, 'two');
});

test('deleting the last vehicle clears the active vehicle', () => {
  const result = removeVehicleFromState([vehicle('one')], 'one', 'one');

  assert.deepEqual(result.vehicles, []);
  assert.equal(result.activeVehicleId, null);
});
