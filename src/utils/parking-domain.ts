import type {
  ParkingAggregateStats,
  ParkingAvailability,
  ParkingPricing,
  ParkingSegmentSummary,
} from '@/types/parking-domain';

export function aggregateParkingSegments(
  segments: readonly ParkingSegmentSummary[],
): ParkingAggregateStats {
  let totalCapacity = 0;
  let availableCapacity = 0;
  let availabilityCapacity = 0;
  let hasKnownCapacity = false;
  let hasKnownAvailability = false;
  let minimumHourlyRate: number | null = null;
  let maximumHourlyRate: number | null = null;
  let hasFreeParking = false;
  let hasUnknownPricing = false;
  let updatedAt: string | null = null;
  const availabilityStatuses = new Set<ParkingAvailability['status']>();

  for (const segment of segments) {
    if (segment.capacity !== null) {
      hasKnownCapacity = true;
      totalCapacity += segment.capacity;
    }
    if (segment.availability.availableSpaces !== null) {
      hasKnownAvailability = true;
      availableCapacity += segment.availability.availableSpaces;
      availabilityCapacity += segment.availability.totalSpaces ?? 0;
    }
    availabilityStatuses.add(segment.availability.status);

    if (segment.pricing.status === 'free') {
      hasFreeParking = true;
    } else if (segment.pricing.status === 'unknown') {
      hasUnknownPricing = true;
    } else if (segment.pricing.hourlyRate !== null) {
      minimumHourlyRate =
        minimumHourlyRate === null
          ? segment.pricing.hourlyRate
          : Math.min(minimumHourlyRate, segment.pricing.hourlyRate);
      maximumHourlyRate =
        maximumHourlyRate === null
          ? segment.pricing.hourlyRate
          : Math.max(maximumHourlyRate, segment.pricing.hourlyRate);
    }

    if (
      segment.updatedAt !== null &&
      (updatedAt === null || segment.updatedAt > updatedAt)
    ) {
      updatedAt = segment.updatedAt;
    }
  }

  const knownTotal = hasKnownCapacity ? totalCapacity : null;
  const knownAvailable = hasKnownAvailability ? availableCapacity : null;
  const availabilityPercent =
    availabilityCapacity > 0 && knownAvailable !== null
      ? Math.round((knownAvailable / availabilityCapacity) * 100)
      : null;
  const availabilityStatus =
    availabilityStatuses.size === 0
      ? 'unknown'
      : availabilityStatuses.size === 1
        ? [...availabilityStatuses][0]
        : 'mixed';

  return {
    segmentCount: segments.length,
    totalCapacity: knownTotal,
    availableCapacity: knownAvailable,
    availabilityPercent,
    pricing: {
      minimumHourlyRate,
      maximumHourlyRate,
      hasFreeParking,
      hasUnknownPricing,
    },
    availabilityStatus,
    updatedAt,
  };
}

export function formatParkingAggregateCount(stats: ParkingAggregateStats) {
  if (stats.totalCapacity !== null) {
    return `${stats.totalCapacity.toLocaleString('de-DE')} ${
      stats.totalCapacity === 1 ? 'space' : 'spaces'
    }`;
  }

  return `${stats.segmentCount.toLocaleString('de-DE')} parking ${
    stats.segmentCount === 1 ? 'area' : 'areas'
  }`;
}

export function formatParkingPrice(pricing: ParkingPricing) {
  if (pricing.status === 'free') {
    return 'Free';
  }
  if (pricing.status === 'unknown') {
    return 'Price unavailable';
  }
  return pricing.hourlyRate === null
    ? 'Paid, rate unavailable'
    : `EUR ${pricing.hourlyRate.toFixed(2)} / hr`;
}
