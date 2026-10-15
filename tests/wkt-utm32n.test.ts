import assert from 'node:assert/strict';
import test from 'node:test';

import {
  parseLineStringWkt,
  utm32nToWgs84,
  wktLineStringToWgs84Path,
} from '../src/utils/wkt-utm32n';

function assertClose(actual: number, expected: number, tolerance = 0.0001) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  );
}

test('parseLineStringWkt parses a two-point LINESTRING', () => {
  assert.deepEqual(
    parseLineStringWkt('LINESTRING (691000 5333000, 691100 5333100)'),
    [
      { easting: 691000, northing: 5333000 },
      { easting: 691100, northing: 5333100 },
    ],
  );
});

test('parseLineStringWkt returns null for non-LineString, degenerate, or malformed input', () => {
  assert.equal(parseLineStringWkt('POINT (1 2)'), null);
  assert.equal(parseLineStringWkt('LINESTRING (1 2)'), null);
  assert.equal(parseLineStringWkt('garbage'), null);
  assert.equal(parseLineStringWkt('LINESTRING (1 2, a b)'), null);
});

test('utm32nToWgs84 converts the repo WKT fixture to the expected Munich coordinates', () => {
  const first = utm32nToWgs84({ easting: 691000, northing: 5333000 });
  assertClose(first.latitude, 48.121582);
  assertClose(first.longitude, 11.566605);

  const second = utm32nToWgs84({ easting: 691100, northing: 5333100 });
  assertClose(second.latitude, 48.122451);
  assertClose(second.longitude, 11.567992);
});

test('utm32nToWgs84 round-trips a known Munich landmark (Marienplatz)', () => {
  const result = utm32nToWgs84({ easting: 691650.37, northing: 5334754.25 });
  assertClose(result.latitude, 48.137154);
  assertClose(result.longitude, 11.576124);
});

test('wktLineStringToWgs84Path returns null for missing or unparseable input', () => {
  assert.equal(wktLineStringToWgs84Path(null), null);
  assert.equal(wktLineStringToWgs84Path(undefined), null);
  assert.equal(wktLineStringToWgs84Path(''), null);
  assert.equal(wktLineStringToWgs84Path('garbage'), null);
});

test('wktLineStringToWgs84Path reprojects a real WKT LineString into a WGS84 path', () => {
  const path = wktLineStringToWgs84Path(
    'LINESTRING (691000 5333000, 691100 5333100)',
  );
  if (path === null) {
    throw new Error('expected a path');
  }
  assert.equal(path.length, 2);
  assertClose(path[0].latitude, 48.121582);
  assertClose(path[1].longitude, 11.567992);
});

test('wktLineStringToWgs84Path memoizes by the exact WKT string', () => {
  const wkt = 'LINESTRING (691000 5333000, 691100 5333100)';
  const first = wktLineStringToWgs84Path(wkt);
  const second = wktLineStringToWgs84Path(wkt);
  assert.equal(first, second);
});
