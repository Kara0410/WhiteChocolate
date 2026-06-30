import { supabase } from '@/lib/supabase';
import type { ParkingBoundingBox } from '@/types/parking-map';
import type { ParkingSegment } from '@/types/parking-segment';
import { parkingSegmentFromRow } from '@/utils/parking-segments';

const PARKING_SEGMENT_COLUMNS =
  'id,strasse,angebot,parkregel_beschreibung,parkregel_gruppe,parkregel_name,prm_name,geoportal_class,lat,lon';
const MAX_SEGMENTS_PER_REQUEST = 2_000;
const QUERY_TIMEOUT_MS = 10_000;

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
  const query = supabase
    .from('parking_segments')
    .select(PARKING_SEGMENT_COLUMNS)
    .not('lat', 'is', null)
    .not('lon', 'is', null)
    .gte('lat', bounds.minLat)
    .lte('lat', bounds.maxLat)
    .gte('lon', bounds.minLng)
    .lte('lon', bounds.maxLng)
    .order('id')
    .limit(MAX_SEGMENTS_PER_REQUEST + 1);

  const { data, error } = await withQueryTimeout(async (signal) =>
    query.abortSignal(signal),
  );

  if (error) {
    throw new Error(`Unable to fetch parking segments: ${error.message}`);
  }

  const rows = data ?? [];
  const segments = rows
    .slice(0, MAX_SEGMENTS_PER_REQUEST)
    .map(parkingSegmentFromRow)
    .filter((segment): segment is ParkingSegment => segment !== null);

  return {
    segments,
    truncated: rows.length > MAX_SEGMENTS_PER_REQUEST,
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
    throw new Error(`Unable to fetch parking segment: ${error.message}`);
  }

  return data ? parkingSegmentFromRow(data) : null;
}
