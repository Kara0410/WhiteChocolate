import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import designTokens = require('../src/constants/design-tokens');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

async function source(path: string) {
  return readFile(resolve(root, path), 'utf8');
}

test('semantic tokens preserve every exact SVG-defined color', () => {
  assert.equal(designTokens.colors.accent.primary, '#824DFF');
  assert.equal(designTokens.colors.accent.surfaceTint, '#601CFF');
  assert.equal(designTokens.colors.text.primary, '#323232');
  assert.equal(designTokens.colors.text.placeholder, '#797979');
  assert.equal(designTokens.figma.glassBase, '#FFFFFF');
  assert.equal(designTokens.colors.surface.glass, 'rgba(255,255,255,0.10)');
  assert.equal(
    designTokens.colors.surface.glassTint,
    'rgba(96,28,255,0.10)',
  );
});

test('home geometry preserves the 405 by 874 reference relationships', () => {
  assert.equal(designTokens.home.referenceWidth, 405);
  assert.equal(designTokens.home.referenceHeight, 874);
  assert.equal(designTokens.home.horizontalInset, 25);
  assert.equal(designTokens.home.searchHeight, 47);
  assert.equal(designTokens.home.navigationHeight, 67);
  assert.equal(designTokens.home.navigationBottom, 32);
  assert.equal(designTokens.home.gpsSize, 47);
  assert.equal(designTokens.home.gpsNavigationGap, 25);
});

test('home controls use the shared glass system and accessible labels', async () => {
  const [navbar, search] = await Promise.all([
    source('src/components/BottomNavBar.tsx'),
    source('src/components/parking-map/map-search-bar.tsx'),
  ]);

  assert.match(navbar, /variant="navigation"/);
  assert.match(navbar, /variant="floatingAction"/);
  assert.match(navbar, /accessibilityLabel: 'Map'/);
  assert.match(navbar, /accessibilityLabel: 'Favorite'/);
  assert.match(navbar, /accessibilityLabel: 'Profile'/);
  assert.match(navbar, /accessibilityLabel="Current location"/);
  assert.match(search, /variant="search"/);
  assert.match(search, /accessibilityLabel="Search"/);
  assert.match(search, /Search here/);
});

test('active application source no longer contains the retired palettes', async () => {
  const [tailwind, legacyTheme] = await Promise.all([
    source('tailwind.config.js'),
    source('src/constants/theme.ts'),
  ]);
  const activeThemeSource = `${tailwind}\n${legacyTheme}`;

  for (const retired of [
    '#2563EB',
    '#DFA536',
    '#E9E1D3',
    '#25292e',
    'warm-paper',
  ]) {
    assert.doesNotMatch(activeThemeSource, new RegExp(retired, 'i'));
  }
});
