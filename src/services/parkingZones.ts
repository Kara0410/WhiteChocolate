import { supabase } from '@/lib/supabase';
import type { ParkingZone } from '@/types/parking-zone';

const PARKING_ZONE_COLUMNS = 'id,name,status,massnahme,geojson';

export async function fetchParkingZones(): Promise<ParkingZone[]> {
  const { data, error } = await supabase
    .from('parking_zones')
    .select(PARKING_ZONE_COLUMNS)
    .order('name');

  if (error) {
    throw new Error(`Unable to fetch parking zones: ${error.message}`);
  }

  return (data ?? []).map((zone) => ({
    id: zone.id,
    name: zone.name,
    status: zone.status,
    massnahme: zone.massnahme,
    geojson: zone.geojson,
  }));
}
