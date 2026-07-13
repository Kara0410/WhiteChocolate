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

type GetCuratedNearbyParkingSpotsOptions = GetNearestParkingSpotsOptions & {
  groupDuplicates?: boolean;
};

export const SEARCH_NEARBY_RESULT_LIMIT = 25;
/**
 * Two spots this close together that share a zone (or both lack zone info)
 * are treated as segments of the same physical parking option; only the
 * best-ranked one is kept.
 */
const DUPLICATE_GROUP_RADIUS_METERS = 30;
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

function getSpotGroupKey(spot: ParkingClusterResponse) {
  return spot.zoneId ?? spot.zoneName ?? spot.bestSpot.zoneName ?? null;
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
    return second.availabilityPercent - first.availabilityPercent;
  }

  const firstPrice = getEffectivePrice(first);
  const secondPrice = getEffectivePrice(second);
  if (firstPrice !== secondPrice) {
    return firstPrice - secondPrice;
  }

  return distanceGap;
}

function isDuplicateNearbyOption(
  candidate: ParkingSpotWithDistance,
  accepted: ParkingSpotWithDistance,
) {
  const candidateKey = getSpotGroupKey(candidate);
  const acceptedKey = getSpotGroupKey(accepted);
  if (
    candidateKey !== null &&
    acceptedKey !== null &&
    candidateKey !== acceptedKey
  ) {
    return false;
  }

  return (
    haversineDistanceMeters(candidate, accepted) <=
    DUPLICATE_GROUP_RADIUS_METERS
  );
}

/**
 * Ranks segments for the nearby parking-area experience: primarily by
 * distance to the destination, with availability and free/cheaper parking
 * breaking ties between equally close options, and near-identical street
 * segments collapsed to their best representative.
 *
 * TODO(server): the ideal implementation is a Supabase/PostGIS RPC —
 * ST_DWithin with a 300–500 m radius (expanding when too few rows match),
 * KNN ordering via the `<->` operator on the segment geometry, and
 * server-side grouping per zone. Client-side ranking over the viewport
 * fetch is sufficient while results stay within the 2000-segment cap.
 */
export function getCuratedNearbyParkingSpots({
  origin,
  spots,
  limit = SEARCH_NEARBY_RESULT_LIMIT,
  groupDuplicates = true,
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

  if (!groupDuplicates) {
    return ranked.slice(0, limit);
  }

  const curated: ParkingSpotWithDistance[] = [];
  for (const candidate of ranked) {
    if (curated.length >= limit) {
      break;
    }
    if (
      !curated.some((accepted) =>
        isDuplicateNearbyOption(candidate, accepted),
      )
    ) {
      curated.push(candidate);
    }
  }

  return curated;
}
