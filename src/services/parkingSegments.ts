import { supabase } from '@/lib/supabase';
import type { ParkingBoundingBox } from '@/types/parking-map';
import type { ParkingSegment } from '@/types/parking-segment';
import { parkingSegmentFromRow } from '@/utils/parking-segments';

const PARKING_SEGMENT_COLUMNS =
  'id,strasse,angebot,parkregel_beschreibung,parkregel_gruppe,parkregel_name,prm_name,geoportal_class,shape,lat,lon';
const MAX_SEGMENTS_PER_REQUEST = 2_000;

export async function fetchParkingSegments(bounds?: ParkingBoundingBox) {
  let query = supabase
    .from('parking_segments')
    .select(PARKING_SEGMENT_COLUMNS)
    .not('lat', 'is', null)
    .not('lon', 'is', null)
    .order('id')
    .limit(MAX_SEGMENTS_PER_REQUEST + 1);

  if (bounds) {
    query = query
      .gte('lat', bounds.minLat)
      .lte('lat', bounds.maxLat)
      .gte('lon', bounds.minLng)
      .lte('lon', bounds.maxLng);
  }

  const { data, error } = await query;

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
