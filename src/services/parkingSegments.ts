import { supabase } from '@/lib/supabase';
import type { ParkingBoundingBox } from '@/types/parking-map';
import type { ParkingSegment } from '@/types/parking-segment';
import {
  getParkingSegmentPageRange,
  parkingSegmentFromRow,
  type ParkingSegmentSelectRow,
} from '@/utils/parking-segments';

const PARKING_SEGMENT_COLUMNS =
  'id,strasse,angebot,parkregel_beschreibung,parkregel_gruppe,parkregel_name,prm_name,geoportal_class,lat,lon';
const MAX_SEGMENTS_PER_REQUEST = 2_000;
const SEGMENT_PAGE_SIZE = 1_000;
const QUERY_TIMEOUT_MS = 10_000;
const MUNICH_TEST_BBOX = {
  minLng: 11.35,
  minLat: 48.0,
  maxLng: 11.75,
  maxLat: 48.25,
};

function isDevelopmentBuild() {
  return typeof __DEV__ !== 'undefined' && __DEV__;
}

function intersectsMunichTestBbox(bounds: ParkingBoundingBox) {
  return (
    bounds.minLng <= MUNICH_TEST_BBOX.maxLng &&
    bounds.maxLng >= MUNICH_TEST_BBOX.minLng &&
    bounds.minLat <= MUNICH_TEST_BBOX.maxLat &&
    bounds.maxLat >= MUNICH_TEST_BBOX.minLat
  );
}

function logParkingSegmentQueryResult({
  bounds,
  error,
  rowCount,
  truncated,
}: {
  bounds?: ParkingBoundingBox;
  error?: unknown;
  rowCount: number;
  truncated?: boolean;
}) {
  if (!isDevelopmentBuild()) {
    return;
  }

  if (error) {
    const supabaseError = error as {
      code?: unknown;
      message?: unknown;
      status?: unknown;
    };
    console.warn('[parking-map] parking_segments query error', {
      bbox: bounds ?? null,
      code:
        typeof supabaseError.code === 'string'
          ? supabaseError.code
          : undefined,
      message:
        typeof supabaseError.message === 'string'
          ? supabaseError.message
          : 'Unknown Supabase query error.',
      status:
        typeof supabaseError.status === 'number'
          ? supabaseError.status
          : undefined,
    });
    return;
  }

  const outcome =
    rowCount > 0
      ? 'success-with-rows'
      : bounds && intersectsMunichTestBbox(bounds)
        ? 'possible-rls-filtered-zero-row-result'
        : 'valid-zero-row-geographic-result';

  const payload = {
    bbox: bounds,
    outcome,
    rowCount,
    truncated: truncated === true,
  };

  if (outcome === 'possible-rls-filtered-zero-row-result') {
    console.warn('[parking-map] parking_segments query result', payload);
  } else {
    console.debug('[parking-map] parking_segments query result', payload);
  }
}

async function withQueryTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS);

  try {
    const result = await operation(controller.signal);

    if (controller.signal.aborted) {
      throw new Error('Supabase parking request timed out.');
    }

    return result;
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error('Supabase parking request timed out.');
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchParkingSegments(bounds: ParkingBoundingBox) {
  const rows: ParkingSegmentSelectRow[] = [];
  const rowLimitWithOverflow = MAX_SEGMENTS_PER_REQUEST + 1;

  while (rows.length < rowLimitWithOverflow) {
    const pageRange = getParkingSegmentPageRange(
      rows.length,
      rowLimitWithOverflow,
      SEGMENT_PAGE_SIZE,
    );
    if (pageRange === null) {
      break;
    }
    const pageSize = pageRange.to - pageRange.from + 1;
    const { data, error } = await withQueryTimeout(async (signal) =>
      supabase
        .from('parking_segments')
        .select(PARKING_SEGMENT_COLUMNS)
        .not('lat', 'is', null)
        .not('lon', 'is', null)
        .gte('lat', bounds.minLat)
        .lte('lat', bounds.maxLat)
        .gte('lon', bounds.minLng)
        .lte('lon', bounds.maxLng)
        .order('id')
        .range(pageRange.from, pageRange.to)
        .abortSignal(signal),
    );

    if (error) {
      logParkingSegmentQueryResult({
        bounds,
        error,
        rowCount: rows.length,
      });
      throw new Error(`Unable to fetch parking segments: ${error.message}`);
    }

    const page = data ?? [];
    rows.push(...page);
    if (page.length < pageSize) {
      break;
    }
  }

  const segments = rows
    .slice(0, MAX_SEGMENTS_PER_REQUEST)
    .map(parkingSegmentFromRow)
    .filter((segment): segment is ParkingSegment => segment !== null);
  const truncated = rows.length > MAX_SEGMENTS_PER_REQUEST;

  logParkingSegmentQueryResult({
    bounds,
    rowCount: segments.length,
    truncated,
  });

  return {
    segments,
    truncated,
  };
}

export async function fetchParkingSegmentById(id: string) {
  const segmentId = id.trim();

  if (!segmentId) {
    return null;
  }

  const { data, error } = await withQueryTimeout(async (signal) =>
    supabase
      .from('parking_segments')
      .select(PARKING_SEGMENT_COLUMNS)
      .eq('id', segmentId)
      .not('lat', 'is', null)
      .not('lon', 'is', null)
      .abortSignal(signal)
      .maybeSingle(),
  );

  if (error) {
    logParkingSegmentQueryResult({
      error,
      rowCount: 0,
    });
    throw new Error(`Unable to fetch parking segment: ${error.message}`);
  }

  return data ? parkingSegmentFromRow(data) : null;
}
