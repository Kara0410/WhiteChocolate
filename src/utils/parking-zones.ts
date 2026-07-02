import type {
  ParkingZone,
  ParkingZonePolygon,
} from '@/types/parking-zone';

type GeoJsonGeometry = {
  type: 'Polygon' | 'MultiPolygon';
  coordinates: unknown[];
};

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
