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
