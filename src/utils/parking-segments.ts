import type { ParkingSegmentRow } from '@/types/database';
import type {
  ParkingAvailability,
  ParkingPricing,
  ParkingSegmentSummary,
} from '@/types/parking-domain';
import type { ParkingSegment } from '@/types/parking-segment';

export type ParkingSegmentSelectRow = Pick<
  ParkingSegmentRow,
  | 'id'
  | 'strasse'
  | 'angebot'
  | 'parkregel_beschreibung'
  | 'parkregel_gruppe'
  | 'parkregel_name'
  | 'prm_name'
  | 'geoportal_class'
  | 'lat'
  | 'lon'
> &
  Partial<
    Pick<ParkingSegmentRow, 'parking_zone_id' | 'updated_at'>
  >;

function cleanText(value: unknown) {
  const cleaned = typeof value === 'string' ? value.trim() : '';
  return cleaned ? cleaned : null;
}

function hasValidCoordinates(
  row: Pick<ParkingSegmentRow, 'lat' | 'lon'>,
): row is Pick<ParkingSegmentRow, 'lat' | 'lon'> & {
  lat: number;
  lon: number;
} {
  return (
    typeof row.lat === 'number' &&
    Number.isFinite(row.lat) &&
    row.lat >= -90 &&
    row.lat <= 90 &&
    typeof row.lon === 'number' &&
    Number.isFinite(row.lon) &&
    row.lon >= -180 &&
    row.lon <= 180
  );
}

export function getParkingSegmentPageRange(
  loadedRows: number,
  rowLimit: number,
  pageSize: number,
) {
  if (
    !Number.isInteger(loadedRows) ||
    !Number.isInteger(rowLimit) ||
    !Number.isInteger(pageSize) ||
    loadedRows < 0 ||
    rowLimit <= loadedRows ||
    pageSize <= 0
  ) {
    return null;
  }

  const size = Math.min(pageSize, rowLimit - loadedRows);
  return {
    from: loadedRows,
    to: loadedRows + size - 1,
  };
}

export function parkingSegmentFromRow(
  row: ParkingSegmentSelectRow,
): ParkingSegment | null {
  const id = cleanText(row.id);

  if (!id || !hasValidCoordinates(row)) {
    return null;
  }

  return {
    id,
    zoneId:
      typeof row.parking_zone_id === 'number' &&
      Number.isFinite(row.parking_zone_id)
        ? String(row.parking_zone_id)
        : null,
    streetName: cleanText(row.strasse),
    sourceAreaName: cleanText(row.prm_name),
    coordinates: { latitude: row.lat, longitude: row.lon },
    capacity:
      typeof row.angebot === 'number' && Number.isFinite(row.angebot)
        ? Math.max(0, row.angebot)
        : null,
    pricing: pricingFor(
      cleanText(row.parkregel_gruppe),
      cleanText(row.parkregel_name),
      cleanText(row.parkregel_beschreibung),
    ),
    availability: availabilityFor(
      id,
      typeof row.angebot === 'number' && Number.isFinite(row.angebot)
        ? Math.max(0, row.angebot)
        : null,
      cleanText(row.updated_at),
    ),
    regulation: {
      description: cleanText(row.parkregel_beschreibung),
      groupName: cleanText(row.parkregel_gruppe),
      name: cleanText(row.parkregel_name),
      maximumStayMinutes: maxStayFor(
        cleanText(row.parkregel_beschreibung),
      ),
    },
    geoportalClass: cleanText(row.geoportal_class),
    updatedAt: cleanText(row.updated_at),
  };
}

function hashString(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function inferredHourlyRate(groupName: string | null) {
  if (groupName?.startsWith('Kurzzeitparken')) {
    return 2.5;
  }
  if (groupName?.startsWith('Mischparken')) {
    return 2;
  }
  if (groupName?.startsWith('Altstadt')) {
    return 3;
  }
  return null;
}

const EXPLICIT_FREE_PATTERN = /\b(kostenlos|gebührenfrei|entgeltfrei)\b/i;

export function pricingFor(
  groupName: string | null,
  regulationName: string | null,
  description: string | null,
): ParkingPricing {
  const sourceText = [groupName, regulationName, description]
    .filter((value): value is string => value !== null)
    .join(' ');
  if (EXPLICIT_FREE_PATTERN.test(sourceText)) {
    return { status: 'free', currency: 'EUR' };
  }

  const hourlyRate = inferredHourlyRate(groupName);
  if (hourlyRate !== null) {
    return {
      status: 'paid',
      currency: 'EUR',
      hourlyRate,
      dailyRate: null,
    };
  }

  return { status: 'unknown', currency: 'EUR' };
}

function maxStayFor(description: string | null) {
  const match = description?.match(/(\d+)\s*h/i);
  return match ? Number(match[1]) * 60 : null;
}

export function availabilityFor(
  id: string,
  capacity: number | null,
  observedAt: string | null,
): ParkingAvailability {
  if (capacity === null) {
    return {
      status: 'unknown',
      availableSpaces: null,
      totalSpaces: null,
      percent: null,
      confidence: null,
      observedAt: null,
    };
  }

  const availableSpaces =
    capacity === 0 ? 0 : hashString(id) % (capacity + 1);
  return {
    status: 'estimated',
    availableSpaces,
    totalSpaces: capacity,
    percent:
      capacity === 0
        ? null
        : Math.round((availableSpaces / capacity) * 100),
    confidence: null,
    observedAt,
  };
}

export function parkingSegmentToSummary(
  segment: ParkingSegment,
): ParkingSegmentSummary {
  return {
    id: segment.id,
    zoneId: segment.zoneId,
    streetName: segment.streetName,
    sourceAreaName: segment.sourceAreaName,
    coordinates: segment.coordinates,
    capacity: segment.capacity,
    pricing: segment.pricing,
    availability: segment.availability,
    updatedAt: segment.updatedAt,
  };
}
