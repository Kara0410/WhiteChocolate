import { supabase } from '@/lib/supabase';
import type { ParkingAdministrativeZone } from '@/types/parking-domain';
import type { ParkingZone } from '@/types/parking-zone';
import { parkingZoneToAdministrativeZone } from '@/utils/parking-zones';

export const PARKING_ZONE_TABLE = 'parking_zones';
export const PARKING_ZONE_FIELDS = [
  'id',
  'name',
  'status',
  'massnahme',
  'geojson',
] as const;
const PARKING_ZONE_COLUMNS = 'id,name,status,massnahme,geojson' as const;

export async function fetchParkingZones(): Promise<
  ParkingAdministrativeZone[]
> {
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

  const sourceZones: ParkingZone[] = (data ?? []).map((zone) => ({
    id: String(zone.id),
    name: zone.name,
    status: zone.status,
    massnahme: zone.massnahme,
    geojson: zone.geojson,
  }));
  const zones = sourceZones.flatMap((zone) => {
    const normalized = parkingZoneToAdministrativeZone(zone);
    return normalized === null ? [] : [normalized];
  });

  if (__DEV__ && zones.length !== sourceZones.length) {
    console.warn('[parking-zones] rejected invalid zone geometry', {
      fields: PARKING_ZONE_FIELDS,
      rejectedRows: sourceZones.length - zones.length,
      schema: 'public',
      table: PARKING_ZONE_TABLE,
    });
  }

  return zones;
}
