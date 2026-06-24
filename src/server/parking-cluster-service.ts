import { clusterParkingRecords } from '@/server/parking-clustering';
import { mockParkingRecords } from '@/server/parking-records';
import type {
  ParkingBoundingBox,
  ParkingClusterResponse,
} from '@/types/parking-map';

async function fetchPostgisClusters(
  bbox: ParkingBoundingBox,
  zoom: number,
): Promise<ParkingClusterResponse[] | null> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_parking_clusters`,
    {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        min_lng: bbox.minLng,
        min_lat: bbox.minLat,
        max_lng: bbox.maxLng,
        max_lat: bbox.maxLat,
        requested_zoom: zoom,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`PostGIS cluster query failed with HTTP ${response.status}`);
  }

  return (await response.json()) as ParkingClusterResponse[];
}

export async function getParkingClusters(
  bbox: ParkingBoundingBox,
  zoom: number,
) {
  const postgisClusters = await fetchPostgisClusters(bbox, zoom);
  return (
    postgisClusters ??
    clusterParkingRecords(mockParkingRecords, bbox, zoom)
  );
}
