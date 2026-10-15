import type { ParkingCoordinates } from '@/types/parking-domain';

export type UtmPoint = { easting: number; northing: number };

const LINESTRING_PATTERN = /^\s*LINESTRING\s*\(\s*([^)]+?)\s*\)\s*$/i;

/** Parses a `LINESTRING (x y, x y, ...)` WKT string into raw easting/northing pairs.
 * Returns null for anything malformed, non-LineString, or with fewer than 2 points —
 * callers must skip that segment's line silently rather than throw. */
export function parseLineStringWkt(wkt: string): UtmPoint[] | null {
  const match = LINESTRING_PATTERN.exec(wkt);
  if (match === null) {
    return null;
  }

  const points: UtmPoint[] = [];
  for (const pair of match[1].split(',')) {
    const parts = pair.trim().split(/\s+/);
    if (parts.length < 2) {
      return null;
    }
    const easting = Number(parts[0]);
    const northing = Number(parts[1]);
    if (!Number.isFinite(easting) || !Number.isFinite(northing)) {
      return null;
    }
    points.push({ easting, northing });
  }

  return points.length >= 2 ? points : null;
}

/** Munich's parking-segment inventory is always EPSG:25832 (ETRS89 / UTM zone 32N,
 * northern hemisphere). Zone 32 / central meridian 9°E is intentionally hardcoded — this
 * is not a general multi-zone reprojector. */
const UTM_ZONE_32N = {
  a: 6378137.0, // WGS84/GRS80 semi-major axis
  f: 1 / 298.257223563, // WGS84/GRS80 flattening
  k0: 0.9996, // UTM scale factor
  falseEasting: 500000,
  centralMeridianRadians: (9 * Math.PI) / 180, // zone 32 -> (32*6-183) = 9°E
} as const;

/** Closed-form ellipsoidal inverse transverse Mercator (Krüger series), WGS84/GRS80,
 * zone 32N. Accurate to well under 1m across the Munich area. */
export function utm32nToWgs84(point: UtmPoint): ParkingCoordinates {
  const { a, f, k0, falseEasting, centralMeridianRadians } = UTM_ZONE_32N;
  const e2 = f * (2 - f);
  const ep2 = e2 / (1 - e2);
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));

  const x = point.easting - falseEasting;
  const y = point.northing; // northern hemisphere, no 10,000,000 subtraction

  const m = y / k0;
  const mu =
    m / (a * (1 - e2 / 4 - (3 * e2 ** 2) / 64 - (5 * e2 ** 3) / 256));

  const phi1 =
    mu +
    ((3 * e1) / 2 - (27 * e1 ** 3) / 32) * Math.sin(2 * mu) +
    ((21 * e1 ** 2) / 16 - (55 * e1 ** 4) / 32) * Math.sin(4 * mu) +
    ((151 * e1 ** 3) / 96) * Math.sin(6 * mu) +
    ((1097 * e1 ** 4) / 512) * Math.sin(8 * mu);

  const n1 = a / Math.sqrt(1 - e2 * Math.sin(phi1) ** 2);
  const t1 = Math.tan(phi1) ** 2;
  const c1 = ep2 * Math.cos(phi1) ** 2;
  const r1 = (a * (1 - e2)) / Math.pow(1 - e2 * Math.sin(phi1) ** 2, 1.5);
  const d = x / (n1 * k0);

  const latitude =
    phi1 -
    ((n1 * Math.tan(phi1)) / r1) *
      (d ** 2 / 2 -
        ((5 + 3 * t1 + 10 * c1 - 4 * c1 ** 2 - 9 * ep2) * d ** 4) / 24 +
        ((61 + 90 * t1 + 298 * c1 + 45 * t1 ** 2 - 252 * ep2 - 3 * c1 ** 2) *
          d ** 6) /
          720);

  const longitude =
    centralMeridianRadians +
    (d -
      ((1 + 2 * t1 + c1) * d ** 3) / 6 +
      ((5 - 2 * c1 + 28 * t1 - 3 * c1 ** 2 + 8 * ep2 + 24 * t1 ** 2) * d ** 5) /
        120) /
      Math.cos(phi1);

  return {
    latitude: (latitude * 180) / Math.PI,
    longitude: (longitude * 180) / Math.PI,
  };
}

const MAX_PATH_CACHE_ENTRIES = 4000;
const pathCache = new Map<string, ParkingCoordinates[] | null>();

/** Parses + reprojects a `LINESTRING (x y, x y, ...)` EPSG:25832 WKT string into a WGS84
 * path. Returns null for missing/unparseable/degenerate input — callers must skip that
 * segment's line silently, never throw. Memoized by the exact WKT string: the same
 * real-world street's shape text recurs across every fetch/pan, and parsing+reprojecting
 * is pure, so caching here once means every caller shares a single cache instead of each
 * re-parsing the same segment. */
export function wktLineStringToWgs84Path(
  wkt: string | null | undefined,
): ParkingCoordinates[] | null {
  if (!wkt) {
    return null;
  }

  const cached = pathCache.get(wkt);
  if (cached !== undefined) {
    return cached;
  }

  const utmPoints = parseLineStringWkt(wkt);
  const result = utmPoints === null ? null : utmPoints.map(utm32nToWgs84);

  if (pathCache.size >= MAX_PATH_CACHE_ENTRIES) {
    const oldestKey = pathCache.keys().next().value;
    if (oldestKey !== undefined) {
      pathCache.delete(oldestKey);
    }
  }
  pathCache.set(wkt, result);

  return result;
}
