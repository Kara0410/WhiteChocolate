import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getMapSearchControlTop,
  getMapSearchLayout,
  MAP_SEARCH_BAR_HEIGHT,
} from '../src/utils/map-search-layout';

test('keeps map search below the top safe area', () => {
  const layout = getMapSearchLayout({
    insetTop: 32,
    viewportBottom: 900,
  });

  assert.equal(layout.searchTop, 64);
  assert.ok(layout.searchTop >= 32);
  assert.ok(layout.searchTop + MAP_SEARCH_BAR_HEIGHT < 900);
});

test('constrains suggestions above the keyboard viewport', () => {
  const open = getMapSearchLayout({
    insetTop: 32,
    viewportBottom: 900,
  });
  const keyboardOpen = getMapSearchLayout({
    insetTop: 32,
    viewportBottom: 420,
  });

  assert.equal(keyboardOpen.searchTop, open.searchTop);
  assert.ok(keyboardOpen.suggestionMaxHeight < open.suggestionMaxHeight);
  assert.ok(
    keyboardOpen.resultsTop + keyboardOpen.suggestionMaxHeight <= 420,
  );
});

test('positions Search this area below the map search field', () => {
  const layout = getMapSearchLayout({
    insetTop: 32,
    viewportBottom: 900,
  });
  const controlTop = getMapSearchControlTop(32);

  assert.ok(controlTop > layout.searchTop + MAP_SEARCH_BAR_HEIGHT);
});
