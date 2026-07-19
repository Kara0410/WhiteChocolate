import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getSearchNavbarLayout,
  SEARCH_INPUT_HEIGHT,
} from '../src/utils/search-navbar-layout';

test('keeps active search below the Android top safe area', () => {
  const layout = getSearchNavbarLayout({
    containerHeight: 900,
    insetBottom: 24,
    insetTop: 32,
    windowWidth: 420,
  });

  assert.equal(layout.searchTop, 44);
  assert.ok(layout.searchTop >= 32);
  assert.ok(layout.searchTop + SEARCH_INPUT_HEIGHT < 900);
});

test('uses the measured overlay height for the inactive navbar position', () => {
  const layout = getSearchNavbarLayout({
    containerHeight: 860,
    insetBottom: 24,
    insetTop: 32,
    windowWidth: 420,
  });

  assert.equal(layout.normalTop, 758);
});

test('keeps the active search fixed and constrains suggestions after keyboard resize', () => {
  const open = getSearchNavbarLayout({
    containerHeight: 900,
    insetBottom: 24,
    insetTop: 32,
    windowWidth: 420,
  });
  const keyboardOpen = getSearchNavbarLayout({
    containerHeight: 480,
    insetBottom: 24,
    insetTop: 32,
    windowWidth: 420,
  });

  assert.equal(keyboardOpen.searchTop, open.searchTop);
  assert.ok(keyboardOpen.suggestionMaxHeight < open.suggestionMaxHeight);
  assert.ok(
    keyboardOpen.searchTop +
      SEARCH_INPUT_HEIGHT +
      keyboardOpen.suggestionMaxHeight <=
      480,
  );
});
