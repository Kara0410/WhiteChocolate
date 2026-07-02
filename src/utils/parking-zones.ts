import type {
  ParkingZone,
  ParkingZonePolygon,
} from '@/types/parking-zone';
import type {
  ParkingCoordinates,
  ParkingMapRecord,
} from '@/types/parking-map';

type GeoJsonGeometry = {
  type: 'Polygon' | 'MultiPolygon';
  coordinates: unknown[];
};

export type ParkingZoneMatch = {
  zoneId: string;
  zoneName: string | null;
};

type IndexedParkingZonePolygon = {
  bounds: {
    maxLatitude: number;
    maxLongitude: number;
    minLatitude: number;
    minLongitude: number;
  };
  polygon: ParkingZonePolygon;
};

const POINT_ON_SEGMENT_EPSILON = 1e-10;

function normalizeZoneName(value: string | null | undefined) {
  return value?.trim().toLocaleLowerCase('de-DE') ?? '';
}

function polygonBounds(
  coordinates: ParkingCoordinates[],
): IndexedParkingZonePolygon['bounds'] {
  return coordinates.reduce(
    (bounds, coordinate) => ({
      maxLatitude: Math.max(bounds.maxLatitude, coordinate.latitude),
      maxLongitude: Math.max(bounds.maxLongitude, coordinate.longitude),
      minLatitude: Math.min(bounds.minLatitude, coordinate.latitude),
      minLongitude: Math.min(bounds.minLongitude, coordinate.longitude),
    }),
    {
      maxLatitude: -Infinity,
      maxLongitude: -Infinity,
      minLatitude: Infinity,
      minLongitude: Infinity,
    },
  );
}

function isPointOnSegment(
  point: ParkingCoordinates,
  start: ParkingCoordinates,
  end: ParkingCoordinates,
) {
  const crossProduct =
    (point.latitude - start.latitude) *
      (end.longitude - start.longitude) -
    (point.longitude - start.longitude) *
      (end.latitude - start.latitude);
  if (Math.abs(crossProduct) > POINT_ON_SEGMENT_EPSILON) {
    return false;
  }

  return (
    point.longitude >=
      Math.min(start.longitude, end.longitude) -
        POINT_ON_SEGMENT_EPSILON &&
    point.longitude <=
      Math.max(start.longitude, end.longitude) +
        POINT_ON_SEGMENT_EPSILON &&
    point.latitude >=
      Math.min(start.latitude, end.latitude) -
        POINT_ON_SEGMENT_EPSILON &&
    point.latitude <=
      Math.max(start.latitude, end.latitude) +
        POINT_ON_SEGMENT_EPSILON
  );
}

export function isCoordinateInsidePolygon(
  point: ParkingCoordinates,
  polygon: ParkingCoordinates[],
) {
  if (polygon.length < 3) {
    return false;
  }

  let isInside = false;
  for (
    let currentIndex = 0, previousIndex = polygon.length - 1;
    currentIndex < polygon.length;
    previousIndex = currentIndex, currentIndex += 1
  ) {
    const current = polygon[currentIndex];
    const previous = polygon[previousIndex];

    if (isPointOnSegment(point, previous, current)) {
      return true;
    }

    const crossesLatitude =
      current.latitude > point.latitude !==
      previous.latitude > point.latitude;
    if (
      crossesLatitude &&
      point.longitude <
        ((previous.longitude - current.longitude) *
          (point.latitude - current.latitude)) /
          (previous.latitude - current.latitude) +
          current.longitude
    ) {
      isInside = !isInside;
    }
  }

  return isInside;
}

/**
 * Builds a reusable matcher once per zone polygon set. Bounds and exact-name
 * lookups avoid most polygon scans, while the coordinate cache ensures each
 * visible marker is classified only once for that set of zones.
 *
 * This is the bounded client fallback. Once parking_segments exposes
 * zone_id/zone_name from a PostGIS ST_Contains/ST_Intersects join, those
 * server fields should replace this matcher without changing clustering.
 */
export function createParkingZoneMatcher(polygons: ParkingZonePolygon[]) {
  const indexedPolygons: IndexedParkingZonePolygon[] = polygons.map(
    (polygon) => ({
      bounds: polygonBounds(polygon.coordinates),
      polygon,
    }),
  );
  const zonesByName = new Map<string, ParkingZoneMatch>();
  for (const { polygon } of indexedPolygons) {
    const normalizedName = normalizeZoneName(polygon.zoneName);
    if (normalizedName && !zonesByName.has(normalizedName)) {
      zonesByName.set(normalizedName, {
        zoneId: polygon.zoneId,
        zoneName: polygon.zoneName,
      });
    }
  }
  const coordinateCache = new Map<string, ParkingZoneMatch | null>();

  return (
    coordinates: ParkingCoordinates,
    zoneNameHint?: string | null,
  ): ParkingZoneMatch | null => {
    const normalizedHint = normalizeZoneName(zoneNameHint);
    const nameMatch = normalizedHint
      ? zonesByName.get(normalizedHint)
      : undefined;
    if (nameMatch) {
      return nameMatch;
    }

    const cacheKey = `${coordinates.latitude.toFixed(7)}:${coordinates.longitude.toFixed(7)}`;
    if (coordinateCache.has(cacheKey)) {
      return coordinateCache.get(cacheKey) ?? null;
    }

    const match = indexedPolygons.find(({ bounds, polygon }) => {
      if (
        coordinates.latitude < bounds.minLatitude ||
        coordinates.latitude > bounds.maxLatitude ||
        coordinates.longitude < bounds.minLongitude ||
        coordinates.longitude > bounds.maxLongitude
      ) {
        return false;
      }

      return isCoordinateInsidePolygon(coordinates, polygon.coordinates);
    });
    const result = match
      ? {
          zoneId: match.polygon.zoneId,
          zoneName: match.polygon.zoneName,
        }
      : null;
    coordinateCache.set(cacheKey, result);
    return result;
  };
}

export function assignParkingRecordsToZones(
  records: ParkingMapRecord[],
  matchZone: ReturnType<typeof createParkingZoneMatcher>,
) {
  return records.map((record): ParkingMapRecord => {
    const match = matchZone(record, record.zoneName);
    return {
      ...record,
      parkingZoneId: match?.zoneId ?? null,
      parkingZoneName: match?.zoneName ?? null,
    };
  });
}

function averageOfVertices(
  coordinates: ParkingCoordinates[],
): ParkingCoordinates {
  const sum = coordinates.reduce(
    (accumulated, coordinate) => ({
      latitude: accumulated.latitude + coordinate.latitude,
      longitude: accumulated.longitude + coordinate.longitude,
    }),
    { latitude: 0, longitude: 0 },
  );
  return {
    latitude: sum.latitude / coordinates.length,
    longitude: sum.longitude / coordinates.length,
  };
}

function shoelaceCentroid(
  coordinates: ParkingCoordinates[],
): ParkingCoordinates | null {
  let doubledArea = 0;
  let latitudeSum = 0;
  let longitudeSum = 0;

  for (
    let currentIndex = 0, previousIndex = coordinates.length - 1;
    currentIndex < coordinates.length;
    previousIndex = currentIndex, currentIndex += 1
  ) {
    const current = coordinates[currentIndex];
    const previous = coordinates[previousIndex];
    const cross =
      previous.longitude * current.latitude -
      current.longitude * previous.latitude;
    doubledArea += cross;
    latitudeSum += (previous.latitude + current.latitude) * cross;
    longitudeSum += (previous.longitude + current.longitude) * cross;
  }

  if (Math.abs(doubledArea) < 1e-12) {
    return null;
  }

  return {
    latitude: latitudeSum / (3 * doubledArea),
    longitude: longitudeSum / (3 * doubledArea),
  };
}

const representativePointCache = new WeakMap<
  ParkingZonePolygon,
  ParkingCoordinates
>();

/**
 * Anchor point for zone summary bubbles. A raw centroid can fall outside
 * concave or ring-shaped zones, so the strategy is:
 * 1. area-weighted centroid, used directly when it lies inside the polygon;
 * 2. otherwise the midpoint of the widest inside-interval on the horizontal
 *    scanline through the centroid latitude (guaranteed inside);
 * 3. fallback to the vertex average only when the polygon is degenerate
 *    (near-zero area or no scanline crossings).
 *
 * If parking_zones later exposes a PostGIS ST_PointOnSurface column, that
 * server value should replace this computation.
 */
export function getZoneRepresentativePoint(
  polygon: ParkingZonePolygon,
): ParkingCoordinates {
  const cached = representativePointCache.get(polygon);
  if (cached) {
    return cached;
  }

  const { coordinates } = polygon;
  const centroid =
    shoelaceCentroid(coordinates) ?? averageOfVertices(coordinates);
  let result = centroid;

  if (!isCoordinateInsidePolygon(centroid, coordinates)) {
    const crossings: number[] = [];
    for (
      let currentIndex = 0, previousIndex = coordinates.length - 1;
      currentIndex < coordinates.length;
      previousIndex = currentIndex, currentIndex += 1
    ) {
      const current = coordinates[currentIndex];
      const previous = coordinates[previousIndex];
      const crossesLatitude =
        current.latitude > centroid.latitude !==
        previous.latitude > centroid.latitude;
      if (crossesLatitude) {
        crossings.push(
          ((previous.longitude - current.longitude) *
            (centroid.latitude - current.latitude)) /
            (previous.latitude - current.latitude) +
            current.longitude,
        );
      }
    }

    crossings.sort((first, second) => first - second);
    let widestSpan = -Infinity;
    for (
      let crossingIndex = 0;
      crossingIndex + 1 < crossings.length;
      crossingIndex += 2
    ) {
      const span = crossings[crossingIndex + 1] - crossings[crossingIndex];
      if (span > widestSpan) {
        widestSpan = span;
        result = {
          latitude: centroid.latitude,
          longitude: (crossings[crossingIndex] + crossings[crossingIndex + 1]) / 2,
        };
      }
    }
  }

  representativePointCache.set(polygon, result);
  return result;
}

export type ParkingZoneSummary = {
  zoneId: string;
  zoneName: string | null;
  spotCount: number;
  latitude: number;
  longitude: number;
};

type ZoneAssignedPoint = {
  latitude: number;
  longitude: number;
  zoneId?: string | null;
  zoneName?: string | null;
};

function boundsArea(bounds: IndexedParkingZonePolygon['bounds']) {
  return (
    (bounds.maxLatitude - bounds.minLatitude) *
    (bounds.maxLongitude - bounds.minLongitude)
  );
}

const polygonBoundsCache = new WeakMap<
  ParkingZonePolygon,
  IndexedParkingZonePolygon['bounds']
>();

function getCachedPolygonBounds(polygon: ParkingZonePolygon) {
  const cached = polygonBoundsCache.get(polygon);
  if (cached) {
    return cached;
  }
  const bounds = polygonBounds(polygon.coordinates);
  polygonBoundsCache.set(polygon, bounds);
  return bounds;
}

/**
 * Builds one summary per zone from already zone-assigned spots. The anchor
 * is the representative point of the zone's largest polygon so the bubble
 * sits inside the zone even for MultiPolygon zones; if no polygon is known
 * for a zoneId the mean of that zone's spot coordinates is used instead.
 */
export function buildZoneSummaries(
  spots: readonly ZoneAssignedPoint[],
  polygons: ParkingZonePolygon[],
): ParkingZoneSummary[] {
  const grouped = new Map<
    string,
    { zoneName: string | null; spots: ZoneAssignedPoint[] }
  >();
  for (const spot of spots) {
    if (!spot.zoneId) {
      continue;
    }
    const existing = grouped.get(spot.zoneId);
    if (existing) {
      existing.spots.push(spot);
      existing.zoneName ??= spot.zoneName ?? null;
    } else {
      grouped.set(spot.zoneId, {
        zoneName: spot.zoneName ?? null,
        spots: [spot],
      });
    }
  }

  const largestPolygonByZone = new Map<string, ParkingZonePolygon>();
  for (const polygon of polygons) {
    const current = largestPolygonByZone.get(polygon.zoneId);
    if (
      current === undefined ||
      boundsArea(getCachedPolygonBounds(polygon)) >
        boundsArea(getCachedPolygonBounds(current))
    ) {
      largestPolygonByZone.set(polygon.zoneId, polygon);
    }
  }

  return [...grouped.entries()]
    .sort(([firstZoneId], [secondZoneId]) =>
      firstZoneId.localeCompare(secondZoneId),
    )
    .map(([zoneId, group]) => {
      const polygon = largestPolygonByZone.get(zoneId);
      const anchor = polygon
        ? getZoneRepresentativePoint(polygon)
        : averageOfVertices(
            group.spots.map((spot) => ({
              latitude: spot.latitude,
              longitude: spot.longitude,
            })),
          );

      return {
        zoneId,
        zoneName: group.zoneName,
        spotCount: group.spots.length,
        latitude: anchor.latitude,
        longitude: anchor.longitude,
      };
    });
}

/**
 * Zoom used when tapping a zone summary. Fits the zone's bounds to the map
 * width where possible, but is clamped so the camera always lands inside
 * spotDetail (otherwise tapping a large zone would leave the user stuck in
 * zoneSummary with nothing changed on screen).
 */
export function getZoneFocusZoom(
  polygons: ParkingZonePolygon[],
  zoneId: string,
  mapWidthPixels: number,
  minZoom: number,
  maxZoom = 17,
) {
  const zonePolygons = polygons.filter(
    (polygon) => polygon.zoneId === zoneId,
  );
  if (zonePolygons.length === 0 || mapWidthPixels <= 0) {
    return minZoom;
  }

  let minLongitude = Infinity;
  let maxLongitude = -Infinity;
  for (const polygon of zonePolygons) {
    const bounds = getCachedPolygonBounds(polygon);
    minLongitude = Math.min(minLongitude, bounds.minLongitude);
    maxLongitude = Math.max(maxLongitude, bounds.maxLongitude);
  }

  const paddedLongitudeSpan = Math.max(
    (maxLongitude - minLongitude) * 1.3,
    0.000001,
  );
  const fitZoom = Math.log2(
    (360 * (mapWidthPixels / 256)) / paddedLongitudeSpan,
  );

  return Math.min(maxZoom, Math.max(minZoom, fitZoom));
}

function parseGeometry(value: unknown): GeoJsonGeometry | null {
  let parsed = value;

  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return null;
    }
  }

  if (parsed === null || typeof parsed !== 'object') {
    return null;
  }

  const candidate = parsed as {
    type?: unknown;
    coordinates?: unknown;
    geometry?: unknown;
  };
  if (candidate.type === 'Feature') {
    return parseGeometry(candidate.geometry);
  }
  if (
    (candidate.type !== 'Polygon' &&
      candidate.type !== 'MultiPolygon') ||
    !Array.isArray(candidate.coordinates)
  ) {
    return null;
  }

  return {
    type: candidate.type,
    coordinates: candidate.coordinates,
  };
}

function coordinateRingFromGeoJson(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  const coordinates = value.flatMap((position) => {
    if (
      !Array.isArray(position) ||
      position.length < 2 ||
      typeof position[0] !== 'number' ||
      !Number.isFinite(position[0]) ||
      position[0] < -180 ||
      position[0] > 180 ||
      typeof position[1] !== 'number' ||
      !Number.isFinite(position[1]) ||
      position[1] < -90 ||
      position[1] > 90
    ) {
      return [];
    }

    return [
      {
        latitude: position[1],
        longitude: position[0],
      },
    ];
  });

  return coordinates.length >= 3 ? coordinates : null;
}

function outerRingsFromGeometry(geometry: GeoJsonGeometry) {
  if (geometry.type === 'Polygon') {
    const rings = geometry.coordinates;
    return Array.isArray(rings) && rings.length > 0 ? [rings[0]] : [];
  }

  return geometry.coordinates.flatMap((polygon) =>
    Array.isArray(polygon) && polygon.length > 0 ? [polygon[0]] : [],
  );
}

export function parkingZonesToPolygons(
  zones: ParkingZone[],
): ParkingZonePolygon[] {
  return zones.flatMap((zone) => {
    const geometry = parseGeometry(zone.geojson);
    if (geometry === null) {
      return [];
    }

    return outerRingsFromGeometry(geometry).flatMap((ring, index) => {
      const coordinates = coordinateRingFromGeoJson(ring);
      return coordinates === null
        ? []
        : [
            {
              id: `${zone.id}:${index}`,
              zoneId: zone.id,
              zoneName: zone.name,
              coordinates,
            },
          ];
    });
  });
}
