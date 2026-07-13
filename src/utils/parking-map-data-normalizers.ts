import type {
  ParkingAggregateStats,
  ParkingCellSummary,
  ParkingSegmentSummary,
  ParkingZoneSummary,
} from '@/types/parking-domain';

type UnknownRow = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRow {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parkingStringValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function numberValue(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function nonNegativeNumber(value: unknown) {
  const parsed = numberValue(value);
  return parsed !== null && parsed >= 0 ? parsed : null;
}

function booleanValue(value: unknown) {
  return typeof value === 'boolean' ? value : false;
}

function availabilityStatus(
  value: unknown,
): ParkingAggregateStats['availabilityStatus'] {
  return value === 'live' ||
    value === 'predicted' ||
    value === 'estimated' ||
    value === 'mixed'
    ? value
    : 'unknown';
}

function normalizeStats(row: UnknownRow): ParkingAggregateStats | null {
  const segmentCount = nonNegativeNumber(row.segment_count);
  if (segmentCount === null || !Number.isInteger(segmentCount)) {
    return null;
  }

  return {
    segmentCount,
    totalCapacity: nonNegativeNumber(row.total_capacity),
    availableCapacity: nonNegativeNumber(row.available_capacity),
    availabilityPercent: nonNegativeNumber(row.availability_percent),
    pricing: {
      minimumHourlyRate: nonNegativeNumber(row.minimum_hourly_rate),
      maximumHourlyRate: nonNegativeNumber(row.maximum_hourly_rate),
      hasFreeParking: booleanValue(row.has_free_parking),
      hasUnknownPricing: booleanValue(row.has_unknown_pricing),
    },
    availabilityStatus: availabilityStatus(row.availability_status),
    updatedAt: parkingStringValue(row.updated_at),
  };
}

export function normalizeParkingZoneSummaryRow(
  value: unknown,
): ParkingZoneSummary | null {
  if (!isRecord(value)) {
    return null;
  }
  const zoneId = parkingStringValue(value.zone_id);
  const zoneName = parkingStringValue(value.zone_name);
  const latitude = numberValue(value.representative_latitude);
  const longitude = numberValue(value.representative_longitude);
  const stats = normalizeStats(value);
  if (
    zoneId === null ||
    zoneName === null ||
    latitude === null ||
    longitude === null ||
    stats === null ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return {
    kind: 'zone-summary',
    zoneId,
    zoneName,
    representativePoint: { latitude, longitude },
    stats,
  };
}

export function normalizeParkingCellSummaryRow(
  value: unknown,
): ParkingCellSummary | null {
  if (!isRecord(value)) {
    return null;
  }
  const id = parkingStringValue(value.id);
  const centerLatitude = numberValue(value.center_latitude);
  const centerLongitude = numberValue(value.center_longitude);
  const minLng = numberValue(value.min_lng);
  const minLat = numberValue(value.min_lat);
  const maxLng = numberValue(value.max_lng);
  const maxLat = numberValue(value.max_lat);
  const resolution = value.resolution;
  const stats = normalizeStats(value);
  if (
    id === null ||
    centerLatitude === null ||
    centerLongitude === null ||
    minLng === null ||
    minLat === null ||
    maxLng === null ||
    maxLat === null ||
    (resolution !== 'coarse' && resolution !== 'fine') ||
    stats === null ||
    minLng >= maxLng ||
    minLat >= maxLat
  ) {
    return null;
  }

  return {
    kind: 'cell-summary',
    id,
    parentZoneIds: Array.isArray(value.parent_zone_ids)
      ? value.parent_zone_ids.filter(
          (zoneId): zoneId is string =>
            typeof zoneId === 'string' && zoneId.length > 0,
        )
      : [],
    center: { latitude: centerLatitude, longitude: centerLongitude },
    bounds: { minLng, minLat, maxLng, maxLat },
    resolution,
    stats,
  };
}

export function normalizeParkingSegmentSummaryRow(
  value: unknown,
): ParkingSegmentSummary | null {
  if (!isRecord(value)) {
    return null;
  }
  const id = parkingStringValue(value.id);
  const latitude = numberValue(value.lat);
  const longitude = numberValue(value.lon);
  if (
    id === null ||
    latitude === null ||
    longitude === null ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  const capacity = nonNegativeNumber(value.capacity);
  const availableSpaces = nonNegativeNumber(
    value.estimated_available_capacity,
  );
  const percent = nonNegativeNumber(value.estimated_availability_percent);
  const availability =
    value.availability_status === 'estimated' && capacity !== null
      ? {
          status: 'estimated' as const,
          availableSpaces,
          totalSpaces: capacity,
          percent,
          confidence: null,
          observedAt: parkingStringValue(value.updated_at),
        }
      : {
          status: 'unknown' as const,
          availableSpaces: null,
          totalSpaces: capacity,
          percent: null,
          confidence: null,
          observedAt: null,
        };
  const pricing =
    value.pricing_status === 'free'
      ? ({ status: 'free', currency: 'EUR' } as const)
      : value.pricing_status === 'paid'
        ? ({
            status: 'paid',
            currency: 'EUR',
            hourlyRate: nonNegativeNumber(value.hourly_rate),
            dailyRate: null,
          } as const)
        : ({ status: 'unknown', currency: 'EUR' } as const);

  return {
    id,
    zoneId:
      numberValue(value.parking_zone_id) !== null
        ? String(value.parking_zone_id)
        : null,
    streetName: parkingStringValue(value.street_name),
    sourceAreaName: parkingStringValue(value.source_area_name),
    coordinates: { latitude, longitude },
    capacity,
    pricing,
    availability,
    updatedAt: parkingStringValue(value.updated_at),
  };
}
