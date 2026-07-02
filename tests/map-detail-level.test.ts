import assert from 'node:assert/strict';
import test from 'node:test';

import {
  deriveMapDetailLevel,
  MAP_DETAIL_THRESHOLDS,
  resolveDetailZoom,
} from '../src/components/parking-map/map-detail-level';

test('classifies levels from zoom without a previous level', () => {
  assert.equal(deriveMapDetailLevel({ zoom: 11 }), 'overview');
  assert.equal(deriveMapDetailLevel({ zoom: 13 }), 'zoneSummary');
  assert.equal(deriveMapDetailLevel({ zoom: 16 }), 'spotDetail');
});

test('prefers zoom and falls back to longitudeDelta only when needed', () => {
  assert.equal(resolveDetailZoom({ zoom: 14, longitudeDelta: 20 }), 14);

  const fallback = resolveDetailZoom({
    zoom: Number.NaN,
    longitudeDelta: 360 / 2 ** 13,
  });
  assert.ok(fallback !== null && Math.abs(fallback - 13) < 0.001);

  assert.equal(resolveDetailZoom({ zoom: Number.NaN }), null);
  assert.equal(deriveMapDetailLevel({ zoom: Number.NaN }), 'overview');
  assert.equal(
    deriveMapDetailLevel({ zoom: Number.NaN }, 'spotDetail'),
    'spotDetail',
  );
});

test('hysteresis keeps the level stable near the overview boundary', () => {
  const { overviewReturnZoom, zoneSummaryEnterZoom } = MAP_DETAIL_THRESHOLDS;
  const betweenThresholds = (overviewReturnZoom + zoneSummaryEnterZoom) / 2;

  assert.equal(
    deriveMapDetailLevel({ zoom: betweenThresholds }, 'overview'),
    'overview',
  );
  assert.equal(
    deriveMapDetailLevel({ zoom: betweenThresholds }, 'zoneSummary'),
    'zoneSummary',
  );
  assert.equal(
    deriveMapDetailLevel({ zoom: zoneSummaryEnterZoom }, 'overview'),
    'zoneSummary',
  );
  assert.equal(
    deriveMapDetailLevel({ zoom: overviewReturnZoom }, 'zoneSummary'),
    'overview',
  );
});

test('hysteresis keeps the level stable near the spot-detail boundary', () => {
  const { spotDetailEnterZoom, zoneSummaryReturnZoom } =
    MAP_DETAIL_THRESHOLDS;
  const betweenThresholds =
    (zoneSummaryReturnZoom + spotDetailEnterZoom) / 2;

  assert.equal(
    deriveMapDetailLevel({ zoom: betweenThresholds }, 'zoneSummary'),
    'zoneSummary',
  );
  assert.equal(
    deriveMapDetailLevel({ zoom: betweenThresholds }, 'spotDetail'),
    'spotDetail',
  );
  assert.equal(
    deriveMapDetailLevel({ zoom: spotDetailEnterZoom }, 'zoneSummary'),
    'spotDetail',
  );
  assert.equal(
    deriveMapDetailLevel({ zoom: zoneSummaryReturnZoom }, 'spotDetail'),
    'zoneSummary',
  );
});

test('large zoom jumps can cross both boundaries at once', () => {
  assert.equal(deriveMapDetailLevel({ zoom: 17 }, 'overview'), 'spotDetail');
  assert.equal(deriveMapDetailLevel({ zoom: 11 }, 'spotDetail'), 'overview');
});
