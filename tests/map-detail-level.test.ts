import assert from 'node:assert/strict';
import test from 'node:test';

import {
  deriveParkingSemanticZoomStage,
  PARKING_SEMANTIC_ZOOM_THRESHOLDS,
  resolveDetailZoom,
  type ParkingSemanticZoomStage,
} from '../src/components/parking-map/map-detail-level';

test('classifies all five stages without previous state', () => {
  assert.equal(deriveParkingSemanticZoomStage({ zoom: 11 }), 'city');
  assert.equal(deriveParkingSemanticZoomStage({ zoom: 12 }), 'zone');
  assert.equal(deriveParkingSemanticZoomStage({ zoom: 13.5 }), 'cell');
  assert.equal(
    deriveParkingSemanticZoomStage({ zoom: 15 }),
    'segmentCluster',
  );
  assert.equal(deriveParkingSemanticZoomStage({ zoom: 17 }), 'segment');
});

test('prefers native zoom and safely falls back to longitude delta', () => {
  assert.equal(resolveDetailZoom({ zoom: 14, longitudeDelta: 20 }), 14);
  assert.equal(
    resolveDetailZoom({
      zoom: Number.NaN,
      longitudeDelta: 360 / 2 ** 13,
    }),
    13,
  );
  assert.equal(resolveDetailZoom({ zoom: Number.NaN }), null);
  assert.equal(deriveParkingSemanticZoomStage({ zoom: Number.NaN }), 'city');
  assert.equal(
    deriveParkingSemanticZoomStage({ zoom: Number.NaN }, 'segment'),
    'segment',
  );
});

test('every semantic boundary uses enter and return hysteresis', () => {
  const thresholdPairs: Array<{
    lower: ParkingSemanticZoomStage;
    upper: ParkingSemanticZoomStage;
    enter: number;
    exit: number;
  }> = [
    {
      lower: 'city',
      upper: 'zone',
      enter: PARKING_SEMANTIC_ZOOM_THRESHOLDS.zoneEnter,
      exit: PARKING_SEMANTIC_ZOOM_THRESHOLDS.cityReturn,
    },
    {
      lower: 'zone',
      upper: 'cell',
      enter: PARKING_SEMANTIC_ZOOM_THRESHOLDS.cellEnter,
      exit: PARKING_SEMANTIC_ZOOM_THRESHOLDS.zoneReturn,
    },
    {
      lower: 'cell',
      upper: 'segmentCluster',
      enter: PARKING_SEMANTIC_ZOOM_THRESHOLDS.segmentClusterEnter,
      exit: PARKING_SEMANTIC_ZOOM_THRESHOLDS.cellReturn,
    },
    {
      lower: 'segmentCluster',
      upper: 'segment',
      enter: PARKING_SEMANTIC_ZOOM_THRESHOLDS.segmentEnter,
      exit: PARKING_SEMANTIC_ZOOM_THRESHOLDS.segmentClusterReturn,
    },
  ];

  for (const pair of thresholdPairs) {
    const between = (pair.enter + pair.exit) / 2;
    assert.equal(
      deriveParkingSemanticZoomStage({ zoom: between }, pair.lower),
      pair.lower,
    );
    assert.equal(
      deriveParkingSemanticZoomStage({ zoom: between }, pair.upper),
      pair.upper,
    );
    assert.equal(
      deriveParkingSemanticZoomStage({ zoom: pair.enter }, pair.lower),
      pair.upper,
    );
    assert.equal(
      deriveParkingSemanticZoomStage({ zoom: pair.exit }, pair.upper),
      pair.lower,
    );
  }
});

test('direct zoom jumps resolve without stepping through intermediate stages', () => {
  assert.equal(
    deriveParkingSemanticZoomStage({ zoom: 17 }, 'city'),
    'segment',
  );
  assert.equal(
    deriveParkingSemanticZoomStage({ zoom: 11 }, 'segment'),
    'city',
  );
});
