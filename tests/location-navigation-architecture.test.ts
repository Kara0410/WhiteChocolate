import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  createLocationFocusKey,
  getActiveNavItemKey,
} from '../src/utils/tab-navigation';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

async function source(path: string) {
  return readFile(resolve(root, path), 'utf8');
}

test('Location is the stable default nav item outside Favorites and Account', () => {
  assert.equal(
    getActiveNavItemKey({
      activeOverlay: 'none',
      isAccountRoute: false,
    }),
    'location',
  );
  assert.equal(
    getActiveNavItemKey({
      activeOverlay: 'search',
      isAccountRoute: false,
    }),
    'location',
  );
  assert.equal(
    getActiveNavItemKey({
      activeOverlay: 'parking',
      isAccountRoute: false,
    }),
    'location',
  );
});

test('Favorites and Account select their corresponding nav items', () => {
  assert.equal(
    getActiveNavItemKey({
      activeOverlay: 'favorites',
      isAccountRoute: false,
    }),
    'favorite',
  );
  assert.equal(
    getActiveNavItemKey({
      activeOverlay: 'favorites',
      isAccountRoute: true,
    }),
    'profile',
  );
  assert.equal(
    getActiveNavItemKey({
      activeOverlay: 'none',
      isAccountRoute: false,
    }),
    'location',
  );
});

test('repeated Location presses produce distinct focus requests', () => {
  const first = createLocationFocusKey(1, 1234);
  const second = createLocationFocusKey(2, 1234);

  assert.notEqual(first, second);
  assert.match(first, /^navbar-location:/);
});

test('Location action closes overlays and replaces any route with focused map', async () => {
  const layout = await source('src/app/(tabs)/_layout.tsx');

  assert.match(layout, /locationFocusSequenceRef\.current \+= 1/);
  assert.match(layout, /closeOverlay\(\);[\s\S]*router\.replace\(\{/);
  assert.match(layout, /pathname: '\/map'/);
  assert.match(layout, /locate: createLocationFocusKey/);
  assert.doesNotMatch(layout, /activeKey === 'location'[\s\S]*return/);
});

test('navbar exposes an accessible loading-aware Location action', async () => {
  const navbar = await source('src/components/BottomNavBar.tsx');

  assert.match(navbar, /accessibilityLabel: 'Current location'/);
  assert.match(
    navbar,
    /accessibilityHint: 'Centers the map on your current location'/,
  );
  assert.match(navbar, /icon: Navigation/);
  assert.doesNotMatch(navbar, /LocateFixed/);
  assert.match(navbar, /disabled: isLocationLoading/);
  assert.match(navbar, /<ActivityIndicator color=\{color\} size="small"/);
});

test('ParkingMap consumes each focus key through the existing location flow', async () => {
  const parkingMap = await source(
    'src/components/parking-map/parking-map.tsx',
  );

  assert.match(parkingMap, /void handleCurrentLocationPress\(\)/);
  assert.match(parkingMap, /prepareForLocationFocus\(\)/);
  assert.match(parkingMap, /setSelectedSearchPlace\(null\)/);
  assert.match(parkingMap, /setMapMode\('userLocation'\)/);
  assert.match(parkingMap, /setAutomaticParkingFetchEnabled\(true\)/);
  assert.match(parkingMap, /requestParkingForCamera\(\{/);
  assert.match(parkingMap, /focusLocationSafely\(/);
});

test('focus requests wait for current loading to finish and cannot conflict', async () => {
  const [parkingMap, locationHook, mapRoute] = await Promise.all([
    source('src/components/parking-map/parking-map.tsx'),
    source('src/hooks/use-map-location.ts'),
    source('src/app/(tabs)/map.tsx'),
  ]);

  assert.match(
    parkingMap,
    /currentLocationFocusKey === lastLocationFocusKeyRef\.current \|\|[\s\S]*isLocationLoading/,
  );
  assert.match(locationHook, /if \(locationRequestRef\.current\)/);
  assert.match(locationHook, /return locationRequestRef\.current/);
  assert.match(mapRoute, /setLocationLoading\(isLocationLoading\)/);
});

test('permission denial, settings recovery, and current location reuse remain authoritative', async () => {
  const hook = await source('src/hooks/use-map-location.ts');

  assert.match(hook, /Location\.getForegroundPermissionsAsync\(\)/);
  assert.match(hook, /Location\.requestForegroundPermissionsAsync\(\)/);
  assert.match(hook, /requiresSettings/);
  assert.match(hook, /Linking\.openSettings\(\)/);
  assert.match(hook, /RECENT_LOCATION_REUSE_MS/);
});

test('old floating location button is removed while top search stays independent', async () => {
  const [parkingMap, mapRoute, navbar] = await Promise.all([
    source('src/components/parking-map/parking-map.tsx'),
    source('src/app/(tabs)/map.tsx'),
    source('src/components/BottomNavBar.tsx'),
  ]);

  assert.doesNotMatch(parkingMap, /LocateFixed/);
  assert.doesNotMatch(
    parkingMap,
    /accessibilityLabel="Center map on current location"/,
  );
  assert.match(mapRoute, /<MapSearchBar \/>/);
  assert.doesNotMatch(navbar, /useGooglePlaceSearch|TextInput|key: 'search'/);
});
