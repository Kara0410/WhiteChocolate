import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

async function source(path: string) {
  return readFile(resolve(root, path), 'utf8');
}

test('bottom navbar contains Location, Favorites, and You without Search', async () => {
  const navbar = await source('src/components/BottomNavBar.tsx');

  assert.match(navbar, /label: 'LOCATION'/);
  assert.match(navbar, /label: 'FAVORITES'/);
  assert.match(navbar, /label: 'YOU'/);
  assert.match(
    navbar,
    /NavItemKey = 'location' \| 'favorite' \| 'profile'/,
  );
  assert.doesNotMatch(navbar, /key: 'search'|useGooglePlaceSearch|TextInput/);
});

test('map owns the dedicated search bar and navbar has no search props', async () => {
  const [mapRoute, tabLayout] = await Promise.all([
    source('src/app/(tabs)/map.tsx'),
    source('src/app/(tabs)/_layout.tsx'),
  ]);

  assert.match(mapRoute, /<MapSearchBar \/>/);
  assert.doesNotMatch(
    tabLayout,
    /isSearchActive=|onSearchPress=|onSearchCancel=/,
  );
});

test('opening search preserves the selected destination and recommendations', async () => {
  const parkingMap = await source(
    'src/components/parking-map/parking-map.tsx',
  );

  assert.match(
    parkingMap,
    /if \(activeOverlay === 'none' \|\| activeOverlay === 'search'\) \{\s*return;/,
  );
  assert.match(parkingMap, /setSelectedSearchPlace\(place\)/);
  assert.match(parkingMap, /consumeSelection\(selection\.id\)/);
});

test('route focus still opens the map search UI', async () => {
  const [mapRoute, parkingMap] = await Promise.all([
    source('src/app/(tabs)/map.tsx'),
    source('src/components/parking-map/parking-map.tsx'),
  ]);

  assert.match(mapRoute, /searchFocusKey=\{focusSearch\}/);
  assert.match(parkingMap, /openSearch\(\)/);
});

test('autocomplete remains debounced and stale requests stay guarded', async () => {
  const hook = await source('src/hooks/use-google-place-search.ts');

  assert.match(hook, /SEARCH_DEBOUNCE_MS = 300/);
  assert.match(hook, /requestId !== autocompleteRequestIdRef\.current/);
  assert.match(hook, /autocompleteAbortRef\.current\?\.abort\(\)/);
  assert.match(hook, /const clearQuery = useCallback/);
  assert.match(hook, /setSuggestions\(\[\]\)/);
});

test('Android back and authenticated favorites/account navigation remain wired', async () => {
  const tabLayout = await source('src/app/(tabs)/_layout.tsx');

  assert.match(tabLayout, /BackHandler\.addEventListener/);
  assert.match(tabLayout, /closeOverlay\(\)/);
  assert.match(tabLayout, /if \(!account\.isSignedIn\)/);
  assert.match(tabLayout, /showCreateAccountSheet/);
  assert.match(tabLayout, /router\.push\('\/account'\)/);
});
