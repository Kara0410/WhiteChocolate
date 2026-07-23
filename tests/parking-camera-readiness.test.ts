import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canFocusParkingCamera,
  shouldDeferParkingCameraCommand,
} from '../src/utils/parking-camera-readiness';

test('Android camera focus waits for the native map-loaded event', () => {
  const base = {
    platform: 'android',
    mapWidth: 400,
    mapHeight: 800,
    googleMapRefReady: true,
    appleMapRefReady: false,
  };

  assert.equal(
    canFocusParkingCamera({ ...base, nativeMapReady: false }),
    false,
  );
  assert.equal(
    canFocusParkingCamera({ ...base, nativeMapReady: true }),
    true,
  );
});

test('iOS camera focus becomes ready from the native map ref', () => {
  assert.equal(
    canFocusParkingCamera({
      platform: 'ios',
      mapWidth: 400,
      mapHeight: 800,
      nativeMapReady: true,
      googleMapRefReady: false,
      appleMapRefReady: true,
    }),
    true,
  );
});

test('camera focus requires layout and the platform-specific native ref', () => {
  assert.equal(
    canFocusParkingCamera({
      platform: 'android',
      mapWidth: 0,
      mapHeight: 800,
      nativeMapReady: true,
      googleMapRefReady: true,
      appleMapRefReady: false,
    }),
    false,
  );
  assert.equal(
    canFocusParkingCamera({
      platform: 'android',
      mapWidth: 400,
      mapHeight: 800,
      nativeMapReady: true,
      googleMapRefReady: false,
      appleMapRefReady: true,
    }),
    false,
  );
});

test('camera commands wait for user gestures but not programmatic movement', () => {
  assert.equal(
    shouldDeferParkingCameraCommand({
      isMapMoving: true,
      isProgrammaticCameraMove: false,
    }),
    true,
  );
  assert.equal(
    shouldDeferParkingCameraCommand({
      isMapMoving: true,
      isProgrammaticCameraMove: true,
    }),
    false,
  );
  assert.equal(
    shouldDeferParkingCameraCommand({
      isMapMoving: false,
      isProgrammaticCameraMove: false,
    }),
    false,
  );
});
