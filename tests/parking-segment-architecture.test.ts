import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return sourceFiles(path);
      return ['.ts', '.tsx'].includes(extname(entry.name)) ? [path] : [];
    }),
  );
  return nested.flat();
}

test('active Expo source has no parking-boundary concepts', async () => {
  const files = (await sourceFiles(resolve(root, 'src'))).filter(
    (file) => !file.endsWith(join('types', 'database.ts')),
  );
  const forbidden =
    /parking[_ -]?zones?|parking_zone_id|zoneId|ParkingZone|AdministrativeZone|ZonePolygon|point.?in.?polygon|ST_(?:Contains|Within|Intersects|Covers)|\bpolygons?\b/i;
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(source, forbidden, file);
  }
});

test('map data hook has no boundary argument or compatibility fallback', async () => {
  const source = await readFile(
    resolve(root, 'src/hooks/use-parking-map-data.ts'),
    'utf8',
  );
  assert.match(source, /stage === 'city' \|\| stage === 'cell'/);
  assert.match(source, /fetchParkingSegmentSummaries/);
  assert.doesNotMatch(source, /fetchParkingSegments\b|legacy|matcher/i);
});

test('native map lifecycle renders cells and segments without boundary props', async () => {
  const source = await readFile(
    resolve(root, 'src/components/parking-map/parking-map.tsx'),
    'utf8',
  );
  assert.match(source, /projectedCellSummaries/);
  assert.match(
    await readFile(
      resolve(root, 'src/components/parking-map/use-parking-marker-pipeline.ts'),
      'utf8',
    ),
    /semanticStage === 'city' \|\| semanticStage === 'cell'/,
  );
  assert.doesNotMatch(source, /onPolygonClick|\bpolygons=/);
});

test('generated application database contract has no removed parking objects', async () => {
  const source = await readFile(resolve(root, 'src/types/database.ts'), 'utf8');
  assert.doesNotMatch(source, /^\s+parking_zones:/m);
  assert.doesNotMatch(source, /^\s+parking_zone_summaries:/m);
  assert.doesNotMatch(source, /^\s+parking_zone_raw:/m);
  assert.doesNotMatch(source, /^\s+parking_zone_id:/m);
  assert.doesNotMatch(source, /^\s+parent_zone_ids:/m);
});

test('forward SQL recreates only segment summaries and segment-derived cells', async () => {
  const source = await readFile(
    resolve(
      root,
      'supabase/migrations/20260722000100_remove_parking_zones.sql',
    ),
    'utf8',
  );
  assert.match(source, /create view public\.parking_segment_summaries/);
  assert.match(source, /create function public\.fetch_parking_cells/);
  assert.match(source, /drop trigger if exists assign_parking_segment_zone_trigger/);
  assert.match(source, /drop column if exists parking_zone_id/);
  assert.match(source, /drop table if exists public\.parking_zones/);
  assert.doesNotMatch(source, /drop table[^;]*cascade/i);
});

test('runtime repair keeps the cell RPC segment-derived and adds city resolution', async () => {
  const source = await readFile(
    resolve(
      root,
      'supabase/migrations/20260723000100_parking_runtime_regression_repair.sql',
    ),
    'utf8',
  );
  assert.match(
    source,
    /create or replace function public\.fetch_parking_cells/,
  );
  assert.match(source, /when 'city' then 5000\.0/);
  assert.match(source, /join public\.parking_segments as segment/);
  assert.doesNotMatch(source, /parking_zone|st_(?:covers|contains|within|intersects)\s*\(/i);
});
