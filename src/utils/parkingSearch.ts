import type {
  ParkingClusterResponse,
  ParkingCoordinates,
} from '@/types/parking-map';
import { haversineDistanceMeters } from '@/utils/parking-map-geo';

export type ParkingSpotWithDistance = ParkingClusterResponse & {
  distanceFromSearchMeters: number;
};

type GetNearestParkingSpotsOptions = {
  origin: ParkingCoordinates;
  spots: ParkingClusterResponse[];
  limit?: number;
};

function hasValidCoordinates(item: ParkingCoordinates) {
  return Number.isFinite(item.latitude) && Number.isFinite(item.longitude);
}

export function formatSearchDistance(distanceMeters: number) {
  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)} m away`;
  }

  return `${(distanceMeters / 1000).toFixed(1)} km away`;
}

export function getNearestParkingSpots({
  origin,
  spots,
  limit = 25,
}: GetNearestParkingSpotsOptions): ParkingSpotWithDistance[] {
  if (!hasValidCoordinates(origin)) {
    return [];
  }

  return spots
    .filter((spot) => hasValidCoordinates(spot))
    .map((spot) => ({
      ...spot,
      distanceFromSearchMeters: Math.round(
        haversineDistanceMeters(origin, spot),
      ),
    }))
    .sort(
      (first, second) =>
        first.distanceFromSearchMeters - second.distanceFromSearchMeters,
    )
    .slice(0, limit);
}
