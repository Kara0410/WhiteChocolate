import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  isAccountPathname,
  shouldShowBottomNav,
} from '../src/utils/tab-navigation';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

async function source(path: string) {
  return readFile(resolve(root, path), 'utf8');
}

const normalMap = {
  activeOverlay: 'none' as const,
  focusedMapSurface: 'none' as const,
  isAccountRoute: false,
  isMapRoute: true,
};

test('normal map shows the bottom navbar', () => {
  assert.equal(shouldShowBottomNav(normalMap), true);
});

test('every global map overlay hides the bottom navbar', () => {
  for (const activeOverlay of ['favorites', 'search', 'parking'] as const) {
    assert.equal(
      shouldShowBottomNav({ ...normalMap, activeOverlay }),
      false,
    );
  }
});

test('parking detail and search results hide the bottom navbar', () => {
  for (const focusedMapSurface of [
    'parking-detail',
    'search-results',
  ] as const) {
    assert.equal(
      shouldShowBottomNav({ ...normalMap, focusedMapSurface }),
      false,
    );
  }
});

test('closing focused surfaces or overlays restores the navbar', () => {
  assert.equal(
    shouldShowBottomNav({
      ...normalMap,
      activeOverlay: 'favorites',
    }),
    false,
  );
  assert.equal(shouldShowBottomNav(normalMap), true);
  assert.equal(
    shouldShowBottomNav({
      ...normalMap,
      focusedMapSurface: 'parking-detail',
    }),
    false,
  );
  assert.equal(shouldShowBottomNav(normalMap), true);
  assert.equal(
    shouldShowBottomNav({
      ...normalMap,
      focusedMapSurface: 'search-results',
    }),
    false,
  );
  assert.equal(shouldShowBottomNav(normalMap), true);
});

test('focused-surface handoffs remain continuously hidden', () => {
  const favoritesToDetail = [
    shouldShowBottomNav({
      ...normalMap,
      activeOverlay: 'favorites',
    }),
    shouldShowBottomNav({
      ...normalMap,
      focusedMapSurface: 'parking-detail',
    }),
  ];
  const searchToResultsToDetail = [
    shouldShowBottomNav({ ...normalMap, activeOverlay: 'search' }),
    shouldShowBottomNav({
      ...normalMap,
      focusedMapSurface: 'search-results',
    }),
    shouldShowBottomNav({
      ...normalMap,
      focusedMapSurface: 'parking-detail',
    }),
  ];

  assert.deepEqual(favoritesToDetail, [false, false]);
  assert.deepEqual(searchToResultsToDetail, [false, false, false]);
});

test('account and nested account routes hide the bottom navbar', () => {
  assert.equal(isAccountPathname('/account'), true);
  assert.equal(isAccountPathname('/account/preferences'), true);
  assert.equal(isAccountPathname('/account/subscription/details'), true);
  assert.equal(isAccountPathname('/map'), false);

  assert.equal(
    shouldShowBottomNav({
      activeOverlay: 'none',
      focusedMapSurface: 'none',
      isAccountRoute: true,
      isMapRoute: false,
    }),
    false,
  );
});

test('non-map routes hide the navbar and returning to the map restores it', () => {
  assert.equal(
    shouldShowBottomNav({
      ...normalMap,
      isMapRoute: false,
    }),
    false,
  );
  assert.equal(shouldShowBottomNav(normalMap), true);
});

test('Account navigation is route-derived and retains a safe way back', async () => {
  const [layout, accountScreen, nestedAccountScreen] = await Promise.all([
    source('src/app/(tabs)/_layout.tsx'),
    source('src/components/account/account-screen.tsx'),
    source('src/components/account/account-placeholder-screen.tsx'),
  ]);

  assert.match(layout, /const isAccountRoute = isAccountPathname\(pathname\)/);
  assert.match(layout, /router\.push\('\/account'\)/);
  assert.match(layout, /visible=\{isBottomNavVisible\}/);
  assert.match(accountScreen, /router\.back\(\)/);
  assert.match(accountScreen, /router\.replace\('\/map'\)/);
  assert.match(nestedAccountScreen, /router\.back\(\)/);
  assert.match(nestedAccountScreen, /router\.replace\('\/account'\)/);
});

test('camera movement and sheet compact state are not visibility inputs', async () => {
  const [navigation, parkingSheet] = await Promise.all([
    source('src/utils/tab-navigation.ts'),
    source('src/components/parking-map/ParkingBottomSheet.tsx'),
  ]);

  assert.doesNotMatch(navigation, /isMapMoving|mapMode|snapIndex/);
  assert.match(parkingSheet, /compact: \(\) => \{/);
  assert.match(
    parkingSheet,
    /<ParkingDetailContent item=\{item\} onClose=\{closeSheet\}/,
  );
  assert.doesNotMatch(parkingSheet, /setFocusedMapSurface/);
});

test('ParkingMap publishes every focused-surface open and close transition', async () => {
  const [context, parkingMap] = await Promise.all([
    source('src/context/MapOverlayContext.tsx'),
    source('src/components/parking-map/parking-map.tsx'),
  ]);

  assert.match(
    context,
    /setFocusedMapSurface\('search-results'\);\s*setActiveOverlay\('none'\)/,
  );
  assert.match(
    parkingMap,
    /setFocusedMapSurface\('parking-detail'\);\s*setMapMode\('focusedArea'\)/,
  );
  assert.match(
    parkingMap,
    /setFocusedMapSurface\('search-results'\);\s*setMapMode\('focusedArea'\)/,
  );
  assert.match(parkingMap, /setFocusedMapSurface\('none'\)/);
  assert.match(
    parkingMap,
    /selectParkingItem\(item, \{ source, focusCamera: true \}\);\s*closeOverlay\(\)/,
  );
});

test('hidden navbar disables touch and accessibility while animating offscreen', async () => {
  const navbar = await source('src/components/BottomNavBar.tsx');

  assert.match(navbar, /visible\?: boolean/);
  assert.match(navbar, /pointerEvents=\{visible \? 'box-none' : 'none'\}/);
  assert.match(navbar, /accessibilityElementsHidden=\{!visible\}/);
  assert.match(
    navbar,
    /importantForAccessibility=\{visible \? 'auto' : 'no-hide-descendants'\}/,
  );
  assert.match(navbar, /opacity: progress/);
  assert.match(navbar, /translateY: reduceMotion \? 0/);
});
