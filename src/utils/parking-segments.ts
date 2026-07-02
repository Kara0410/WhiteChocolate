import type { ParkingSegmentRow } from '@/types/database';
import type { ParkingMapRecord } from '@/types/parking-map';
import type { ParkingSegment } from '@/types/parking-segment';

const FALLBACK_UPDATED_AT = '1970-01-01T00:00:00.000Z';

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
    street: cleanText(row.strasse),
    capacity:
      typeof row.angebot === 'number' && Number.isFinite(row.angebot)
        ? Math.max(0, row.angebot)
        : null,
    description: cleanText(row.parkregel_beschreibung),
    groupName: cleanText(row.parkregel_gruppe),
    parkregelName: cleanText(row.parkregel_name),
    prmName: cleanText(row.prm_name),
    geoportalClass: cleanText(row.geoportal_class),
    lat: row.lat,
    lon: row.lon,
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

function priceFor(groupName: string | null) {
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

function maxStayFor(description: string | null) {
  const match = description?.match(/(\d+)\s*h/i);
  return match ? Number(match[1]) * 60 : null;
}

export function parkingSegmentToMapRecord(
  segment: ParkingSegment,
): ParkingMapRecord {
  const capacity = segment.capacity ?? 0;
  const available = capacity === 0 ? 0 : hashString(segment.id) % (capacity + 1);

  return {
    id: segment.id,
    latitude: segment.lat,
    longitude: segment.lon,
    zoneId: segment.prmName ?? segment.street ?? segment.id,
    zoneName: segment.prmName ?? segment.street ?? 'Unnamed parking segment',
    parkingZoneId: null,
    parkingZoneName: null,
    capacity,
    available,
    availabilityPercent:
      capacity === 0 ? 0 : Math.round((available / capacity) * 100),
    updatedAt: FALLBACK_UPDATED_AT,
    pricePerHour: priceFor(segment.groupName),
    maxStay: maxStayFor(segment.description),
    restrictions: segment.description ?? '',
    type: 'zone',
  };
}
