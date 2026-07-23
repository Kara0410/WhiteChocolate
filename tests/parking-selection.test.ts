import assert from 'node:assert/strict';
import test from 'node:test';

import type { ParkingClusterResponse } from '../src/types/parking-map';
import { normalizeParkingAvailabilityPercentage } from '../src/utils/parking-estimates';
import {
  isParkingContextCurrent,
  parkingSnapshotMatchesAvailableSpots,
  resolveCurrentParkingSelection,
} from '../src/utils/parking-selection';

const SEGMENT_ID = '5fbbb70a-355d-421a-8196-30538130eb60';

function spot(
  overrides: Partial<ParkingClusterResponse> = {},
): ParkingClusterResponse {
  const availabilityPercent = overrides.availabilityPercent ?? null;
  const availableSpots = overrides.availableSpots ?? null;
  return {
    id: SEGMENT_ID,
    type: 'spot',
    latitude: 48.1499521300749,
    longitude: 11.5429239906179,
    availabilityPercent,
    availabilityStatus:
      overrides.availabilityStatus ??
      (availabilityPercent === null ? 'unknown' : 'estimated'),
    availabilityConfidence: overrides.availabilityConfidence ?? null,
    estimateGeneratedAt: overrides.estimateGeneratedAt ?? null,
    estimateValidUntil: overrides.estimateValidUntil ?? null,
    estimatorVersion: overrides.estimatorVersion ?? null,
    count: 1,
    spotCount: 1,
    totalCapacity: overrides.totalCapacity ?? 18,
    availableSpots,
    colorStatus: overrides.colorStatus ?? 'neutral',
    minPrice: null,
    avgPrice: null,
    pricingStatus: 'unknown',
    bestSpot: {
      id: SEGMENT_ID,
      label: 'Elvirastr.',
      availableSpots,
      availabilityPercent,
      pricePerHour: null,
    },
    ...overrides,
  };
}

function resolve(
  selectedItem: ParkingClusterResponse,
  options: Partial<Parameters<typeof resolveCurrentParkingSelection>[0]> = {},
) {
  return resolveCurrentParkingSelection({
    activeContextHash: 'current-context',
    favoriteItems: [],
    loadedContextHash: 'current-context',
    searchSnapshot: null,
    selectedItem,
    source: 'marker',
    visibleSpots: [],
    ...options,
  });
}

test('selection created before estimation refreshes from the current UUID', () => {
  const selected = spot();
  const estimated = spot({
    availabilityPercent: 26,
    availabilityStatus: 'estimated',
    availabilityConfidence: 'low',
    availableSpots: 4,
    colorStatus: 'red',
    estimateGeneratedAt: '2026-07-19T12:03:58.504Z',
    estimateValidUntil: '2026-07-19T12:18:58.504Z',
    estimatorVersion: 'heuristic-v2.1-pessimistic',
  });

  const refreshed = resolve(selected, { visibleSpots: [estimated] });

  assert.equal(refreshed, estimated);
  assert.equal(refreshed?.id, selected.id);
  assert.equal(refreshed?.availabilityPercent, 26);
  assert.equal(refreshed?.estimatorVersion, 'heuristic-v2.1-pessimistic');
});

test('unchanged selection preserves object identity and cannot update-loop', () => {
  const selected = spot({ availabilityPercent: 0 });
  const equivalent = structuredClone(selected);

  assert.equal(resolve(selected, { visibleSpots: [equivalent] }), selected);
});

test('current-context search data takes priority for a search selection', () => {
  const selected = spot();
  const searchEstimate = spot({ availabilityPercent: 21 });
  const visibleEstimate = spot({ availabilityPercent: 35 });

  const refreshed = resolve(selected, {
    searchSnapshot: {
      contextHash: 'current-context',
      spots: [searchEstimate],
    },
    source: 'search',
    visibleSpots: [visibleEstimate],
  });

  assert.equal(refreshed, searchEstimate);
});

test('previous-context values never update the selected item', () => {
  const selected = spot();
  const previousEstimate = spot({ availabilityPercent: 90 });

  const refreshed = resolve(selected, {
    loadedContextHash: 'previous-context',
    searchSnapshot: {
      contextHash: 'previous-context',
      spots: [previousEstimate],
    },
    source: 'search',
    visibleSpots: [previousEstimate],
  });

  assert.equal(refreshed, selected);
  assert.equal(refreshed?.availabilityPercent, null);
});

test('canonical UUID matching rejects a different or differently-cased ID', () => {
  const selected = spot();
  const different = spot({ id: '9424127f-b99e-46fc-8165-fc4aea2d0c00' });
  const differentlyCased = spot({ id: SEGMENT_ID.toUpperCase() });

  assert.equal(resolve(selected, { visibleSpots: [different] }), selected);
  assert.equal(
    resolve(selected, { visibleSpots: [differentlyCased] }),
    selected,
  );
});

test('favorite selection refreshes from live segment data, then falls back safely', () => {
  const selected = spot();
  const favorite = spot({ availabilityPercent: 15 });
  const live = spot({ availabilityPercent: 26 });

  assert.equal(
    resolve(selected, {
      favoriteItems: [favorite],
      source: 'favorite',
      visibleSpots: [live],
    }),
    live,
  );
  assert.equal(
    resolve(selected, {
      favoriteItems: [favorite],
      loadedContextHash: 'previous-context',
      source: 'favorite',
      visibleSpots: [live],
    }),
    favorite,
  );
});

test('search snapshot becomes stale when matching current data changes', () => {
  const legacy = spot();
  const estimated = spot({ availabilityPercent: 26 });

  assert.equal(parkingSnapshotMatchesAvailableSpots([legacy], [estimated]), false);
  assert.equal(parkingSnapshotMatchesAvailableSpots([estimated], [estimated]), true);
  assert.equal(parkingSnapshotMatchesAvailableSpots([estimated], []), true);
  assert.equal(isParkingContextCurrent('current', 'previous'), false);
  assert.equal(isParkingContextCurrent('current', 'current'), true);
});

test('percentage-only, zero, and missing estimates remain distinct', () => {
  assert.equal(normalizeParkingAvailabilityPercentage(21), 21);
  assert.equal(normalizeParkingAvailabilityPercentage(0), 0);
  assert.equal(normalizeParkingAvailabilityPercentage(null), null);
  assert.equal(normalizeParkingAvailabilityPercentage(Number.NaN), null);
});
