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

type GetCuratedNearbyParkingSpotsOptions = GetNearestParkingSpotsOptions;

export const SEARCH_NEARBY_RESULT_LIMIT = 25;
/**
 * Spots whose distance from the destination differs by less than this are
 * considered "equally close", letting availability and price break the tie
 * instead of a meaningless few-metre difference.
 */
const SIMILAR_DISTANCE_TOLERANCE_METERS = 40;

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

function getEffectivePrice(spot: ParkingClusterResponse) {
  if (spot.pricingStatus === 'free') {
    return Number.NEGATIVE_INFINITY;
  }
  if (spot.pricingStatus === 'unknown') {
    return Number.POSITIVE_INFINITY;
  }
  return spot.avgPrice ?? spot.minPrice ?? Number.POSITIVE_INFINITY;
}

function compareCuratedSpots(
  first: ParkingSpotWithDistance,
  second: ParkingSpotWithDistance,
) {
  const distanceGap =
    first.distanceFromSearchMeters - second.distanceFromSearchMeters;
  if (Math.abs(distanceGap) > SIMILAR_DISTANCE_TOLERANCE_METERS) {
    return distanceGap;
  }

  if (first.availabilityPercent !== second.availabilityPercent) {
    return (
      (second.availabilityPercent ?? -1) -
      (first.availabilityPercent ?? -1)
    );
  }

  const firstPrice = getEffectivePrice(first);
  const secondPrice = getEffectivePrice(second);
  if (firstPrice !== secondPrice) {
    return firstPrice - secondPrice;
  }

  return distanceGap;
}

/**
 * Ranks segments for the nearby parking-area experience: primarily by
 * distance to the destination, with availability and free/cheaper parking
 * breaking ties between equally close options. Every source segment remains
 * independently selectable.
 *
 * TODO(server): the ideal implementation is a Supabase/PostGIS RPC —
 * ST_DWithin with a 300–500 m radius (expanding when too few rows match),
 * KNN ordering via the `<->` operator on the segment geometry, and
 * stable segment IDs. Client-side ranking over the viewport fetch is
 * sufficient while results stay within the 2000-segment cap.
 */
export function getCuratedNearbyParkingSpots({
  origin,
  spots,
  limit = SEARCH_NEARBY_RESULT_LIMIT,
}: GetCuratedNearbyParkingSpotsOptions): ParkingSpotWithDistance[] {
  if (!hasValidCoordinates(origin)) {
    return [];
  }

  const ranked = spots
    .filter((spot) => hasValidCoordinates(spot))
    .map((spot) => ({
      ...spot,
      distanceFromSearchMeters: Math.round(
        haversineDistanceMeters(origin, spot),
      ),
    }))
    .sort(compareCuratedSpots);

  return ranked.slice(0, limit);
}
