import type {
  ParkingClusterResponse,
  ParkingCoordinates,
} from '@/types/parking-map';
import { getAvailabilityColorStatus } from '@/utils/parking-availability';
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
const SAME_STREET_NEIGHBOR_DISTANCE_METERS = 300;
const CORRIDOR_CONNECTION_DISTANCE_METERS = 18;
const PARALLEL_CORRIDOR_DISTANCE_METERS = 12;
const PARALLEL_PATH_RATIO = 0.67;

function hasValidCoordinates(item: ParkingCoordinates) {
  return Number.isFinite(item.latitude) && Number.isFinite(item.longitude);
}

function normalizeStreetIdentity(item: ParkingClusterResponse) {
  const value = item.streetCorridorKey ?? item.bestSpot.label;
  if (!value?.trim() || value === 'Unnamed parking segment') {
    return `record:${item.id}`;
  }

  return value
    .trim()
    .toLocaleLowerCase('de-DE')
    .replace(/stra(?:ße|sse)/g, 'str')
    .replace(/str\./g, 'str')
    .replace(/[^a-z0-9äöü]+/g, '');
}

function recordsShareStreetIdentity(
  first: ParkingClusterResponse,
  second: ParkingClusterResponse,
) {
  return (
    normalizeStreetIdentity(first) === normalizeStreetIdentity(second) &&
    haversineDistanceMeters(first, second) <=
      SAME_STREET_NEIGHBOR_DISTANCE_METERS
  );
}

function toLocalMeters(point: ParkingCoordinates, latitudeOrigin: number) {
  const latitudeRadians = (latitudeOrigin * Math.PI) / 180;
  return {
    x: point.longitude * 111_320 * Math.cos(latitudeRadians),
    y: point.latitude * 110_540,
  };
}

function pointToPathDistanceMeters(
  point: ParkingCoordinates,
  path: ParkingCoordinates[],
) {
  const latitudeOrigin = point.latitude;
  const localPoint = toLocalMeters(point, latitudeOrigin);
  let closest = Number.POSITIVE_INFINITY;

  for (let index = 1; index < path.length; index += 1) {
    const start = toLocalMeters(path[index - 1], latitudeOrigin);
    const end = toLocalMeters(path[index], latitudeOrigin);
    const deltaX = end.x - start.x;
    const deltaY = end.y - start.y;
    const lengthSquared = deltaX * deltaX + deltaY * deltaY;
    const projection =
      lengthSquared === 0
        ? 0
        : Math.max(
            0,
            Math.min(
              1,
              ((localPoint.x - start.x) * deltaX +
                (localPoint.y - start.y) * deltaY) /
                lengthSquared,
            ),
          );
    const projectedX = start.x + projection * deltaX;
    const projectedY = start.y + projection * deltaY;
    closest = Math.min(
      closest,
      Math.hypot(localPoint.x - projectedX, localPoint.y - projectedY),
    );
  }

  return closest;
}

function closePointRatio(
  first: ParkingCoordinates[],
  second: ParkingCoordinates[],
) {
  return (
    first.filter(
      (point) =>
        pointToPathDistanceMeters(point, second) <=
        PARALLEL_CORRIDOR_DISTANCE_METERS,
    ).length / first.length
  );
}

function pathsRepresentSameCorridor(
  first: ParkingCoordinates[],
  second: ParkingCoordinates[],
) {
  return (
    Math.max(closePointRatio(first, second), closePointRatio(second, first)) >=
    PARALLEL_PATH_RATIO
  );
}

function pathLengthMeters(path: ParkingCoordinates[]) {
  let length = 0;
  for (let index = 1; index < path.length; index += 1) {
    length += haversineDistanceMeters(path[index - 1], path[index]);
  }
  return length;
}

function stitchConnectedPaths(
  current: ParkingCoordinates[],
  candidate: ParkingCoordinates[],
) {
  const joins = [
    {
      distance: haversineDistanceMeters(
        current[current.length - 1],
        candidate[0],
      ),
      currentAtStart: false,
      reverseCandidate: false,
    },
    {
      distance: haversineDistanceMeters(
        current[current.length - 1],
        candidate[candidate.length - 1],
      ),
      currentAtStart: false,
      reverseCandidate: true,
    },
    {
      distance: haversineDistanceMeters(
        current[0],
        candidate[candidate.length - 1],
      ),
      currentAtStart: true,
      reverseCandidate: false,
    },
    {
      distance: haversineDistanceMeters(current[0], candidate[0]),
      currentAtStart: true,
      reverseCandidate: true,
    },
  ].sort((first, second) => first.distance - second.distance);
  const closest = joins[0];
  if (closest.distance > CORRIDOR_CONNECTION_DISTANCE_METERS) {
    return null;
  }

  const orientedCandidate = closest.reverseCandidate
    ? candidate.slice().reverse()
    : candidate;
  return closest.currentAtStart
    ? [...orientedCandidate, ...current]
    : [...current, ...orientedCandidate];
}

function consolidateStreetGeometry(records: ParkingClusterResponse[]) {
  const paths = records
    .flatMap((record) =>
      record.lineGeometry && record.lineGeometry.length >= 2
        ? [record.lineGeometry]
        : [],
    )
    .sort((first, second) => pathLengthMeters(second) - pathLengthMeters(first));
  if (paths.length === 0) {
    return null;
  }

  let merged = [...paths[0]];
  let pending = paths.slice(1);
  while (pending.length > 0) {
    let changed = false;
    const nextPending: ParkingCoordinates[][] = [];
    for (const path of pending) {
      if (pathsRepresentSameCorridor(merged, path)) {
        changed = true;
        continue;
      }
      const stitched = stitchConnectedPaths(merged, path);
      if (stitched) {
        merged = stitched;
        changed = true;
      } else {
        nextPending.push(path);
      }
    }
    pending = nextPending;
    if (!changed) {
      break;
    }
  }

  // Never bridge a missing road section. If valid source fragments cannot be
  // joined, the longest complete source corridor is the safe single highlight.
  return merged;
}

function aggregateAvailability(records: ParkingClusterResponse[]) {
  const countRecords = records.filter(
    (record) =>
      record.availableSpots !== null && record.totalCapacity > 0,
  );
  const countedCapacity = countRecords.reduce(
    (total, record) => total + record.totalCapacity,
    0,
  );
  const countedAvailable = countRecords.reduce(
    (total, record) => total + (record.availableSpots ?? 0),
    0,
  );
  let percentage: number | null =
    countedCapacity > 0
      ? Math.round((countedAvailable / countedCapacity) * 100)
      : null;

  if (percentage === null) {
    const weighted = records.filter(
      (record) =>
        record.availabilityPercent !== null && record.totalCapacity > 0,
    );
    const weightedCapacity = weighted.reduce(
      (total, record) => total + record.totalCapacity,
      0,
    );
    if (weightedCapacity > 0) {
      percentage = Math.round(
        weighted.reduce(
          (total, record) =>
            total + (record.availabilityPercent ?? 0) * record.totalCapacity,
          0,
        ) / weightedCapacity,
      );
    } else {
      const knownPercentages = records.flatMap((record) =>
        record.availabilityPercent === null ? [] : [record.availabilityPercent],
      );
      if (knownPercentages.length > 0) {
        percentage = Math.round(
          knownPercentages.reduce((total, value) => total + value, 0) /
            knownPercentages.length,
        );
      }
    }
  }

  const capacityRecords = records.filter((record) => record.totalCapacity > 0);
  const totalCapacity = capacityRecords.reduce(
    (total, record) => total + record.totalCapacity,
    0,
  );
  const hasCompleteCounts =
    capacityRecords.length > 0 &&
    capacityRecords.every((record) => record.availableSpots !== null);

  return {
    availableSpots: hasCompleteCounts ? countedAvailable : null,
    percentage:
      percentage === null ? null : Math.max(0, Math.min(100, percentage)),
    totalCapacity,
  };
}

function aggregatePricing(records: ParkingClusterResponse[]) {
  const minimums: number[] = [];
  const maximums: number[] = [];
  let hasUnknownPricing = false;

  for (const record of records) {
    if (record.pricingStatus === 'free') {
      minimums.push(0);
      maximums.push(0);
      continue;
    }
    const minimum = record.minPrice ?? record.avgPrice;
    const maximum = record.maxPrice ?? record.avgPrice ?? record.minPrice;
    if (record.pricingStatus === 'paid' && minimum !== null && maximum !== null) {
      minimums.push(minimum);
      maximums.push(maximum);
    } else {
      hasUnknownPricing = true;
    }
  }

  const minPrice = minimums.length > 0 ? Math.min(...minimums) : null;
  const maxPrice = maximums.length > 0 ? Math.max(...maximums) : null;
  const allFree =
    records.length > 0 && records.every((record) => record.pricingStatus === 'free');
  return {
    avgPrice:
      minPrice !== null && maxPrice !== null ? (minPrice + maxPrice) / 2 : null,
    hasUnknownPricing,
    maxPrice,
    minPrice,
    pricingStatus: allFree
      ? ('free' as const)
      : minPrice !== null
        ? ('paid' as const)
        : ('unknown' as const),
  };
}

function groupRecords(
  records: ParkingClusterResponse[],
  origin: ParkingCoordinates,
): ParkingClusterResponse {
  if (records.length === 1) {
    const [record] = records;
    return {
      ...record,
      underlyingParkingRecords: record.underlyingParkingRecords ?? [record],
      representativeParkingRecordId:
        record.representativeParkingRecordId ?? record.id,
    };
  }

  const underlyingParkingRecords = records.flatMap(
    (record) => record.underlyingParkingRecords ?? [record],
  );
  const representative = records.reduce((closest, record) =>
    haversineDistanceMeters(origin, record) <
    haversineDistanceMeters(origin, closest)
      ? record
      : closest,
  );
  const availability = aggregateAvailability(records);
  const pricing = aggregatePricing(records);
  const sourceIds = underlyingParkingRecords
    .map(({ id }) => id)
    .sort((first, second) => first.localeCompare(second));
  const normalizedStreet = normalizeStreetIdentity(representative);
  const hasUnknownAvailability = records.some(
    (record) =>
      record.availabilityStatus === 'unknown' ||
      record.availabilityPercent === null,
  );

  return {
    ...representative,
    ...pricing,
    id: `street:${normalizedStreet}:${sourceIds.join(',')}`,
    type: 'spot',
    latitude: representative.latitude,
    longitude: representative.longitude,
    availabilityPercent: availability.percentage,
    availabilityStatus:
      availability.percentage === null
        ? 'unknown'
        : hasUnknownAvailability
          ? 'mixed'
          : 'estimated',
    availabilityConfidence: records.some(
      ({ availabilityConfidence }) => availabilityConfidence === 'low',
    )
      ? 'low'
      : records.some(
            ({ availabilityConfidence }) => availabilityConfidence === 'medium',
          )
        ? 'medium'
        : null,
    count: underlyingParkingRecords.length,
    spotCount: underlyingParkingRecords.reduce(
      (total, record) => total + (record.spotCount ?? record.count),
      0,
    ),
    totalCapacity: availability.totalCapacity,
    availableSpots: availability.availableSpots,
    colorStatus:
      availability.percentage === null
        ? 'neutral'
        : getAvailabilityColorStatus(availability.percentage),
    bestSpot: {
      ...representative.bestSpot,
      availableSpots: availability.availableSpots,
      availabilityPercent: availability.percentage,
      pricePerHour: pricing.minPrice,
    },
    lineGeometry: consolidateStreetGeometry(records),
    streetCorridorKey:
      representative.streetCorridorKey ?? representative.bestSpot.label,
    underlyingParkingRecords,
    representativeParkingRecordId: representative.id,
  };
}

/**
 * Creates the sole destination-search presentation model. Name equality alone
 * is insufficient: records must also belong to the same local geographic
 * component, preventing identically named streets in distant areas from merging.
 */
export function groupParkingSpotsByStreet({
  origin,
  spots,
}: Pick<GetCuratedNearbyParkingSpotsOptions, 'origin' | 'spots'>) {
  const validSpots = spots.filter(
    (spot) => spot.type === 'spot' && hasValidCoordinates(spot),
  );
  const parents = validSpots.map((_, index) => index);
  const find = (index: number): number => {
    if (parents[index] !== index) parents[index] = find(parents[index]);
    return parents[index];
  };
  const union = (first: number, second: number) => {
    const firstRoot = find(first);
    const secondRoot = find(second);
    if (firstRoot !== secondRoot) parents[secondRoot] = firstRoot;
  };

  for (let first = 0; first < validSpots.length; first += 1) {
    for (let second = first + 1; second < validSpots.length; second += 1) {
      if (recordsShareStreetIdentity(validSpots[first], validSpots[second])) {
        union(first, second);
      }
    }
  }

  const groups = new Map<number, ParkingClusterResponse[]>();
  validSpots.forEach((spot, index) => {
    const root = find(index);
    groups.set(root, [...(groups.get(root) ?? []), spot]);
  });
  return [...groups.values()].map((records) => groupRecords(records, origin));
}

export function formatSearchDistance(distanceMeters: number) {
  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)} m away`;
  }

  return `${(distanceMeters / 1000).toFixed(1)} km away`;
}

export function formatParkingPriceLabel(item: ParkingClusterResponse) {
  if (item.pricingStatus === 'free') {
    return 'Free';
  }

  const minimum = item.minPrice ?? item.avgPrice;
  const maximum = item.maxPrice ?? item.avgPrice ?? item.minPrice;
  if (minimum === null || maximum === null) {
    return 'Price unavailable';
  }

  const unknownSuffix = item.hasUnknownPricing ? ' + unknown rates' : '';
  if (minimum === 0 && maximum > 0) {
    return `Free–EUR ${maximum.toFixed(2)}/hr${unknownSuffix}`;
  }
  if (Math.abs(maximum - minimum) > 0.001) {
    return `EUR ${minimum.toFixed(2)}–${maximum.toFixed(2)}/hr${unknownSuffix}`;
  }
  return `EUR ${minimum.toFixed(2)}/hr${unknownSuffix}`;
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

  const ranked = groupParkingSpotsByStreet({ origin, spots })
    .map((spot) => ({
      ...spot,
      distanceFromSearchMeters: Math.round(
        haversineDistanceMeters(origin, spot),
      ),
    }))
    .sort(compareCuratedSpots);

  return ranked.slice(0, limit);
}
