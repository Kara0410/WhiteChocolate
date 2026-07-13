import assert from 'node:assert/strict';
import test from 'node:test';

import {
  parkingLayerReducer,
  type ParkingLayerState,
} from '../src/utils/parking-layer-state';
import type { ParkingMapFeature } from '../src/types/parking-domain';

function feature(id: string): ParkingMapFeature {
  return {
    id,
    kind: 'zone',
    coordinates: { latitude: 48.13, longitude: 11.58 },
    parentId: null,
    zoneId: id,
    zoneName: id,
    stats: {
      segmentCount: 1,
      totalCapacity: null,
      availableCapacity: null,
      availabilityPercent: null,
      availabilityStatus: 'unknown',
      pricing: {
        minimumHourlyRate: null,
        maximumHourlyRate: null,
        hasFreeParking: false,
        hasUnknownPricing: true,
      },
      updatedAt: null,
    },
  };
}

const initial: ParkingLayerState = {
  activeStage: 'zone',
  visibleStage: 'zone',
  visibleFeatures: [feature('old')],
  outgoingFeatures: [],
  status: 'idle',
  requestKey: null,
  error: null,
};

test('outgoing features remain visible while the next stage loads', () => {
  const loading = parkingLayerReducer(initial, {
    type: 'request',
    stage: 'cell',
    requestKey: 'cell:new',
  });
  assert.deepEqual(loading.visibleFeatures, initial.visibleFeatures);
  assert.equal(loading.visibleStage, 'zone');
  assert.equal(loading.status, 'refreshing');
});

test('new data swaps atomically and retains the outgoing layer', () => {
  const loading = parkingLayerReducer(initial, {
    type: 'request',
    stage: 'cell',
    requestKey: 'cell:new',
  });
  const resolved = parkingLayerReducer(loading, {
    type: 'resolve',
    stage: 'cell',
    requestKey: 'cell:new',
    features: [feature('new')],
  });
  assert.equal(resolved.visibleStage, 'cell');
  assert.equal(resolved.visibleFeatures[0].id, 'new');
  assert.equal(resolved.outgoingFeatures[0].id, 'old');
});

test('resolved data is usable before any transition animation completes', () => {
  const loading = parkingLayerReducer(initial, {
    type: 'request',
    stage: 'cell',
    requestKey: 'cell:new',
  });
  const resolved = parkingLayerReducer(loading, {
    type: 'resolve',
    stage: 'cell',
    requestKey: 'cell:new',
    features: [feature('ready')],
  });
  assert.equal(resolved.status, 'idle');
  assert.equal(resolved.visibleFeatures[0].id, 'ready');
});

test('stale and failed requests cannot erase usable data', () => {
  const loading = parkingLayerReducer(initial, {
    type: 'request',
    stage: 'cell',
    requestKey: 'cell:new',
  });
  const stale = parkingLayerReducer(loading, {
    type: 'resolve',
    stage: 'segment',
    requestKey: 'segment:stale',
    features: [feature('stale')],
  });
  assert.equal(stale.visibleFeatures[0].id, 'old');
  const failed = parkingLayerReducer(stale, {
    type: 'reject',
    requestKey: 'cell:new',
    error: 'network timeout',
  });
  assert.equal(failed.visibleFeatures[0].id, 'old');
  assert.equal(failed.status, 'error');
});
