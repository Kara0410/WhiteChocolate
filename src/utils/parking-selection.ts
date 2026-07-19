import type { ParkingClusterResponse } from '@/types/parking-map';

export type ParkingSelectionSource = 'marker' | 'favorite' | 'search';

type SearchSelectionSnapshot = {
  contextHash: string | null;
  spots: readonly ParkingClusterResponse[];
};

type ResolveParkingSelectionInput = {
  activeContextHash: string | null;
  favoriteItems: readonly ParkingClusterResponse[];
  loadedContextHash: string | null;
  searchSnapshot: SearchSelectionSnapshot | null;
  selectedItem: ParkingClusterResponse | null;
  source: ParkingSelectionSource | null;
  visibleSpots: readonly ParkingClusterResponse[];
};

export function isParkingContextCurrent(
  activeContextHash: string | null,
  loadedContextHash: string | null,
) {
  return activeContextHash === loadedContextHash;
}

function sameBestSpot(
  first: ParkingClusterResponse['bestSpot'],
  second: ParkingClusterResponse['bestSpot'],
) {
  return (
    first.id === second.id &&
    first.zoneName === second.zoneName &&
    first.availableSpots === second.availableSpots &&
    first.availabilityPercent === second.availabilityPercent &&
    first.pricePerHour === second.pricePerHour
  );
}

export function hasSameParkingSelectionData(
  first: ParkingClusterResponse,
  second: ParkingClusterResponse,
) {
  return (
    first.id === second.id &&
    first.type === second.type &&
    first.latitude === second.latitude &&
    first.longitude === second.longitude &&
    first.availabilityPercent === second.availabilityPercent &&
    first.availabilityStatus === second.availabilityStatus &&
    first.availabilityConfidence === second.availabilityConfidence &&
    first.estimateGeneratedAt === second.estimateGeneratedAt &&
    first.estimateValidUntil === second.estimateValidUntil &&
    first.estimatorVersion === second.estimatorVersion &&
    first.count === second.count &&
    first.zoneCount === second.zoneCount &&
    first.spotCount === second.spotCount &&
    first.totalCapacity === second.totalCapacity &&
    first.availableSpots === second.availableSpots &&
    first.colorStatus === second.colorStatus &&
    first.minPrice === second.minPrice &&
    first.avgPrice === second.avgPrice &&
    first.pricingStatus === second.pricingStatus &&
    first.zoneId === second.zoneId &&
    first.zoneName === second.zoneName &&
    first.expansionZoom === second.expansionZoom &&
    first.distanceToDestination === second.distanceToDestination &&
    first.walkingCategory === second.walkingCategory &&
    sameBestSpot(first.bestSpot, second.bestSpot)
  );
}

export function parkingSnapshotMatchesAvailableSpots(
  snapshotSpots: readonly ParkingClusterResponse[],
  visibleSpots: readonly ParkingClusterResponse[],
) {
  return snapshotSpots.every((snapshotSpot) => {
    const currentSpot = visibleSpots.find(
      (spot) => spot.id === snapshotSpot.id,
    );
    return (
      currentSpot === undefined ||
      hasSameParkingSelectionData(snapshotSpot, currentSpot)
    );
  });
}

function findByCanonicalId(
  items: readonly ParkingClusterResponse[],
  selectedId: string,
) {
  return items.find((item) => item.id === selectedId) ?? null;
}

export function resolveCurrentParkingSelection({
  activeContextHash,
  favoriteItems,
  loadedContextHash,
  searchSnapshot,
  selectedItem,
  source,
  visibleSpots,
}: ResolveParkingSelectionInput) {
  if (selectedItem === null || source === null) {
    return selectedItem;
  }

  const selectedId = selectedItem.id;
  const searchMatch =
    source === 'search' &&
    searchSnapshot?.contextHash === activeContextHash
      ? findByCanonicalId(searchSnapshot.spots, selectedId)
      : null;
  const visibleMatch = isParkingContextCurrent(
    activeContextHash,
    loadedContextHash,
  )
    ? findByCanonicalId(visibleSpots, selectedId)
    : null;
  const favoriteMatch = findByCanonicalId(favoriteItems, selectedId);
  const currentItem = searchMatch ?? visibleMatch ?? favoriteMatch;

  if (
    currentItem === null ||
    hasSameParkingSelectionData(selectedItem, currentItem)
  ) {
    return selectedItem;
  }

  return currentItem;
}
