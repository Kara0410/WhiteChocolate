import type {
  ParkingEstimateFactor,
  ParkingSegmentSummary,
} from '@/types/parking-domain';

export type ParkingAvailabilityEstimateResult = {
  segmentId: string;
  availableSpaces: number | null;
  availabilityPercent: number | null;
  status: 'estimated' | 'unknown';
  confidence: 'low' | 'medium';
  generatedAt: string;
  validUntil: string;
  estimatorVersion: string;
  factors: ParkingEstimateFactor[];
};

export function mergeParkingAvailabilityEstimates(
  segments: ParkingSegmentSummary[],
  estimates: ParkingAvailabilityEstimateResult[],
  options?: { unknownWhenMissing?: boolean },
) {
  const estimateBySegment = new Map(
    estimates.map((estimate) => [estimate.segmentId, estimate]),
  );
  return segments.map((segment) => {
    const estimate = estimateBySegment.get(segment.id);
    if (!estimate && options?.unknownWhenMissing) {
      return {
        ...segment,
        availability: {
          status: 'unknown' as const,
          availableSpaces: null,
          totalSpaces: segment.capacity,
          percent: null,
          confidence: null,
          generatedAt: null,
          validUntil: null,
          factors: [],
        },
      };
    }
    if (
      !estimate ||
      estimate.status !== 'estimated' ||
      estimate.availabilityPercent === null
    ) {
      return estimate?.status === 'unknown'
        ? {
            ...segment,
            availability: {
              status: 'unknown' as const,
              availableSpaces: null,
              totalSpaces: segment.capacity,
              percent: null,
              confidence: null,
              generatedAt: null,
              validUntil: null,
              factors: estimate.factors,
            },
          }
        : segment;
    }
    return {
      ...segment,
      availability: {
        status: 'estimated' as const,
        availableSpaces:
          segment.capacity !== null &&
          segment.capacity >= 0 &&
          estimate.availableSpaces !== null
            ? Math.min(segment.capacity, estimate.availableSpaces)
            : null,
        totalSpaces: segment.capacity,
        percent: estimate.availabilityPercent,
        confidence: estimate.confidence,
        generatedAt: estimate.generatedAt,
        validUntil: estimate.validUntil,
        factors: estimate.factors,
      },
    };
  });
}
