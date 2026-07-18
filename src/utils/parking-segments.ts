import type { ParkingSegmentRow } from '@/types/database-aliases';
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
      typeof row.angebot === 'number' && Number.isFinite(row.angebot)
        ? Math.max(0, row.angebot)
        : null,
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
  capacity: number | null,
): ParkingAvailability {
  return {
    status: 'unknown',
    availableSpaces: null,
    totalSpaces: capacity,
    percent: null,
    confidence: null,
    generatedAt: null,
    validUntil: null,
    factors: [],
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
