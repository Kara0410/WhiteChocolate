import { supabase } from '@/lib/supabase';
import type { ParkingZone } from '@/types/parking-zone';

export const PARKING_ZONE_TABLE = 'parking_zones';
export const PARKING_ZONE_FIELDS = [
  'id',
  'name',
  'status',
  'massnahme',
  'geojson',
] as const;
const PARKING_ZONE_COLUMNS = 'id,name,status,massnahme,geojson' as const;

export async function fetchParkingZones(): Promise<ParkingZone[]> {
  const { data, error } = await supabase
    .from(PARKING_ZONE_TABLE)
    .select(PARKING_ZONE_COLUMNS)
    .order('name');

  if (error) {
    if (__DEV__) {
      console.error('[parking-zones] Supabase query failed', {
        code: error.code,
        details: error.details,
        fields: PARKING_ZONE_FIELDS,
        hint: error.hint,
        message: error.message,
        schema: 'public',
        table: PARKING_ZONE_TABLE,
      });
    }
    throw new Error(`Unable to fetch parking zones: ${error.message}`);
  }

  const zones = (data ?? []).map((zone) => ({
    id: String(zone.id),
    name: zone.name,
    status: zone.status,
    massnahme: zone.massnahme,
    geojson: zone.geojson,
  }));

  if (__DEV__ && zones.length === 0) {
    console.warn('[parking-zones] Supabase query returned zero rows', {
      fields: PARKING_ZONE_FIELDS,
      schema: 'public',
      table: PARKING_ZONE_TABLE,
    });
  }

  return zones;
}
