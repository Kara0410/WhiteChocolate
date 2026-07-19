export const PARKING_ESTIMATOR_VERSION = 'heuristic-v2.1-pessimistic';
export const PARKING_ESTIMATOR_TIME_ZONE = 'Europe/Berlin';

export type ParkingPricingStatus = 'free' | 'paid' | 'unknown';
export type ParkingEstimateConfidence = 'low' | 'medium';
export type ParkingDemandCategory =
  | 'commute'
  | 'retail'
  | 'restaurant'
  | 'nightlife'
  | 'entertainment'
  | 'healthcare'
  | 'education'
  | 'tourism'
  | 'residential'
  | 'transit'
  | 'unknown';

export type ParkingEstimateFactor = {
  code: string;
  impact: 'increases-demand' | 'reduces-demand' | 'neutral';
  weight: number;
};

export type ParkingEstimateInput = {
  segmentId: string;
  capacity: number | null;
  regulationGroup: string | null;
  regulationName: string | null;
  regulationDescription: string | null;
  pricingStatus: ParkingPricingStatus;
  hourlyRate: number | null;
  localDateTime: Date;
  generatedAt?: Date;
  destinationDistanceMeters: number | null;
  destinationPrimaryType: string | null;
  destinationTypes: string[];
  destinationIsOpen: boolean | null;
  destinationRatingCount: number | null;
  nearbyPoiCount: number | null;
  trafficRatio: number | null;
  precipitationIntensity: number | null;
};

export type ParkingAvailabilityEstimate = {
  segmentId: string;
  availableSpaces: number | null;
  availabilityPercent: number | null;
  status: 'estimated' | 'unknown';
  confidence: ParkingEstimateConfidence;
  generatedAt: string;
  validUntil: string;
  estimatorVersion: string;
  factors: ParkingEstimateFactor[];
};

export type ParkingTimeBucket =
  | 'overnight'
  | 'morning-peak'
  | 'daytime'
  | 'evening-peak'
  | 'evening'
  | 'late-night';

export const PARKING_ESTIMATOR_CONSTANTS = Object.freeze({
  baseOccupancy: 0.64,
  conservativeMargin: 0.05,
  unknownCapacityMargin: 0.08,
  minimumOccupancy: 0.35,
  maximumOccupancy: 0.98,
  dynamicTtlMinutes: 15,
  staticTtlMinutes: 45,
  timeAdjustments: {
    overnight: -0.12,
    'morning-peak': 0.07,
    daytime: 0.02,
    'evening-peak': 0.09,
    evening: 0.05,
    'late-night': -0.06,
  } satisfies Record<ParkingTimeBucket, number>,
  destinationAdjustments: {
    commute: 0.05,
    retail: 0.05,
    restaurant: 0.06,
    nightlife: 0.1,
    entertainment: 0.08,
    healthcare: 0.04,
    education: 0.04,
    tourism: 0.06,
    residential: 0.03,
    transit: 0.1,
    unknown: 0,
  } satisfies Record<ParkingDemandCategory, number>,
});

const TYPE_CATEGORY_MAP: Readonly<Record<string, ParkingDemandCategory>> = {
  airport: 'transit',
  bar: 'nightlife',
  bus_station: 'transit',
  cafe: 'restaurant',
  coffee_shop: 'restaurant',
  commuter_station: 'transit',
  concert_hall: 'entertainment',
  convention_center: 'entertainment',
  doctor: 'healthcare',
  entertainment: 'entertainment',
  event_venue: 'entertainment',
  hospital: 'healthcare',
  lodging: 'tourism',
  movie_theater: 'entertainment',
  museum: 'tourism',
  night_club: 'nightlife',
  park_and_ride: 'commute',
  performing_arts_theater: 'entertainment',
  restaurant: 'restaurant',
  school: 'education',
  shopping_mall: 'retail',
  store: 'retail',
  subway_station: 'transit',
  tourist_attraction: 'tourism',
  train_station: 'transit',
  transit_station: 'transit',
  university: 'education',
};

const CATEGORY_PRIORITY: readonly ParkingDemandCategory[] = [
  'transit',
  'nightlife',
  'entertainment',
  'healthcare',
  'education',
  'retail',
  'restaurant',
  'tourism',
  'commute',
  'residential',
];

const RESTRICTED_REGULATION_PATTERN =
  /\b(bewohner|resident|anlieger|sonderberechtigung|restricted|nur\s+mit|behinderten(?:parken)?|disabled|handicap|carsharing|baustelle|construction|halteverbot|no[ -]?parking)\b/i;
const SHORT_STAY_PATTERN = /\b(kurzzeit|short[ -]?stay|max(?:imal)?\s*\d+\s*h)\b/i;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function factor(code: string, weight: number): ParkingEstimateFactor {
  return {
    code,
    impact:
      weight > 0
        ? 'increases-demand'
        : weight < 0
          ? 'reduces-demand'
          : 'neutral',
    weight,
  };
}

function berlinParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: PARKING_ESTIMATOR_TIME_ZONE,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';

  return {
    weekday: value('weekday'),
    hour: Number(value('hour')),
    minute: Number(value('minute')),
  };
}

export function getParkingTimeBucket(date: Date): ParkingTimeBucket {
  const { hour, minute } = berlinParts(date);
  const minutes = hour * 60 + minute;
  if (minutes < 6 * 60) return 'overnight';
  if (minutes < 9 * 60 + 30) return 'morning-peak';
  if (minutes < 16 * 60) return 'daytime';
  if (minutes < 19 * 60 + 30) return 'evening-peak';
  if (minutes < 23 * 60) return 'evening';
  return 'late-night';
}

export function mapGoogleTypesToDemandCategory(
  primaryType: string | null,
  types: readonly string[],
): ParkingDemandCategory {
  const categories = new Set<ParkingDemandCategory>();
  for (const type of [primaryType, ...types]) {
    if (!type) continue;
    const direct = TYPE_CATEGORY_MAP[type];
    if (direct) {
      categories.add(direct);
      continue;
    }
    if (type.endsWith('_restaurant')) categories.add('restaurant');
    else if (type.endsWith('_store')) categories.add('retail');
    else if (type.includes('residential')) categories.add('residential');
  }

  return (
    CATEGORY_PRIORITY.find((category) => categories.has(category)) ?? 'unknown'
  );
}

function weekdayAdjustment(date: Date, bucket: ParkingTimeBucket) {
  const { weekday } = berlinParts(date);
  if (weekday === 'Sun') return factor('weekday-sunday', -0.04);
  if (weekday === 'Sat') {
    return factor(
      bucket === 'evening' || bucket === 'late-night'
        ? 'weekday-saturday-evening'
        : 'weekday-saturday',
      bucket === 'evening' || bucket === 'late-night' ? 0.05 : 0,
    );
  }
  if (weekday === 'Fri' && (bucket === 'evening' || bucket === 'late-night')) {
    return factor('weekday-friday-evening', 0.05);
  }
  return factor('weekday-working-day', 0.02);
}

function unavailableEstimate(
  input: ParkingEstimateInput,
  generatedAt: Date,
  code: string,
): ParkingAvailabilityEstimate {
  return {
    segmentId: input.segmentId,
    availableSpaces:
      input.capacity !== null &&
      Number.isInteger(input.capacity) &&
      input.capacity >= 0
        ? 0
        : null,
    availabilityPercent: 0,
    status: 'estimated',
    confidence: 'low',
    generatedAt: generatedAt.toISOString(),
    validUntil: new Date(
      generatedAt.getTime() +
        PARKING_ESTIMATOR_CONSTANTS.staticTtlMinutes * 60_000,
    ).toISOString(),
    estimatorVersion: PARKING_ESTIMATOR_VERSION,
    factors: [factor(code, 0)],
  };
}

export function estimateParkingAvailability(
  input: ParkingEstimateInput,
): ParkingAvailabilityEstimate {
  const generatedAt = input.generatedAt ?? input.localDateTime;
  const regulationText = [
    input.regulationGroup,
    input.regulationName,
    input.regulationDescription,
  ]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(' ');
  if (RESTRICTED_REGULATION_PATTERN.test(regulationText)) {
    return unavailableEstimate(input, generatedAt, 'regulation-not-public');
  }
  if (
    input.capacity !== null &&
    Number.isInteger(input.capacity) &&
    input.capacity <= 0
  ) {
    return unavailableEstimate(input, generatedAt, 'capacity-no-public-spaces');
  }

  const reliableCapacity =
    input.capacity !== null &&
    Number.isInteger(input.capacity) &&
    input.capacity > 0
      ? input.capacity
      : null;

  const timeBucket = getParkingTimeBucket(input.localDateTime);
  const destinationCategory = mapGoogleTypesToDemandCategory(
    input.destinationPrimaryType,
    input.destinationTypes,
  );
  const factors: ParkingEstimateFactor[] = [
    factor('base-occupancy', PARKING_ESTIMATOR_CONSTANTS.baseOccupancy),
    factor(
      `time-${timeBucket}`,
      PARKING_ESTIMATOR_CONSTANTS.timeAdjustments[timeBucket],
    ),
    weekdayAdjustment(input.localDateTime, timeBucket),
  ];

  if (reliableCapacity === null) {
    factors.push(
      factor(
        'capacity-unknown-conservative',
        PARKING_ESTIMATOR_CONSTANTS.unknownCapacityMargin,
      ),
    );
  } else if (reliableCapacity <= 4) {
    factors.push(factor('capacity-very-small', 0.04));
  } else if (reliableCapacity >= 50) {
    factors.push(factor('capacity-large', -0.02));
  }

  if (input.pricingStatus === 'free') {
    factors.push(factor('pricing-free', 0.06));
  } else if (input.pricingStatus === 'paid') {
    factors.push(factor('pricing-paid', -0.03));
  } else {
    factors.push(factor('pricing-unknown', 0));
  }

  if (SHORT_STAY_PATTERN.test(regulationText)) {
    factors.push(factor('regulation-short-stay', 0.02));
  } else if (regulationText) {
    factors.push(factor('regulation-known', 0));
  } else {
    factors.push(factor('regulation-unknown', 0));
  }

  factors.push(
    factor(
      `destination-${destinationCategory}`,
      PARKING_ESTIMATOR_CONSTANTS.destinationAdjustments[destinationCategory],
    ),
  );

  if (input.destinationIsOpen === true) {
    factors.push(factor('destination-open', 0.04));
  } else if (input.destinationIsOpen === false) {
    factors.push(factor('destination-closed', -0.06));
  }

  if (input.destinationDistanceMeters !== null) {
    if (input.destinationDistanceMeters <= 250) {
      factors.push(factor('destination-distance-near', 0.04));
    } else if (input.destinationDistanceMeters <= 500) {
      factors.push(factor('destination-distance-walkable', 0.02));
    } else if (input.destinationDistanceMeters > 1_000) {
      factors.push(factor('destination-distance-far', -0.02));
    }
  }

  if (input.destinationRatingCount !== null) {
    if (input.destinationRatingCount >= 1_000) {
      factors.push(factor('destination-rating-volume-high', 0.03));
    } else if (input.destinationRatingCount >= 250) {
      factors.push(factor('destination-rating-volume-medium', 0.02));
    }
  }

  if (input.nearbyPoiCount !== null) {
    if (input.nearbyPoiCount >= 30) {
      factors.push(factor('nearby-poi-density-high', 0.06));
    } else if (input.nearbyPoiCount >= 10) {
      factors.push(factor('nearby-poi-density-medium', 0.03));
    } else {
      factors.push(factor('nearby-poi-density-low', 0));
    }
  }

  if (input.trafficRatio !== null) {
    if (input.trafficRatio >= 1.5) {
      factors.push(factor('traffic-congestion-high', 0.05));
    } else if (input.trafficRatio >= 1.2) {
      factors.push(factor('traffic-congestion-moderate', 0.03));
    } else {
      factors.push(factor('traffic-congestion-normal', 0));
    }
  }

  if (
    input.precipitationIntensity !== null &&
    input.precipitationIntensity >= 2 &&
    (destinationCategory === 'tourism' ||
      destinationCategory === 'entertainment')
  ) {
    factors.push(factor('weather-rain-outdoor-demand', -0.02));
  }

  factors.push(
    factor(
      'conservative-safety-margin',
      PARKING_ESTIMATOR_CONSTANTS.conservativeMargin,
    ),
  );
  const occupancy = clamp(
    factors.reduce((sum, item) => sum + item.weight, 0),
    PARKING_ESTIMATOR_CONSTANTS.minimumOccupancy,
    PARKING_ESTIMATOR_CONSTANTS.maximumOccupancy,
  );
  const availabilityPercent = Math.round((1 - occupancy) * 100);
  const availableSpaces = reliableCapacity !== null
    ? clamp(
        Math.floor(reliableCapacity * availabilityPercent / 100),
        0,
        reliableCapacity,
      )
    : null;
  const hasGoogleDemandSignal =
    destinationCategory !== 'unknown' &&
    (input.destinationIsOpen !== null ||
      input.destinationRatingCount !== null ||
      input.nearbyPoiCount !== null ||
      input.trafficRatio !== null);
  const confidence: ParkingEstimateConfidence =
    reliableCapacity !== null && regulationText && hasGoogleDemandSignal
      ? 'medium'
      : 'low';
  const hasDynamicSignal =
    input.destinationIsOpen !== null ||
    input.trafficRatio !== null ||
    input.precipitationIntensity !== null;
  const ttlMinutes = hasDynamicSignal
    ? PARKING_ESTIMATOR_CONSTANTS.dynamicTtlMinutes
    : PARKING_ESTIMATOR_CONSTANTS.staticTtlMinutes;

  return {
    segmentId: input.segmentId,
    availableSpaces,
    availabilityPercent,
    status: 'estimated',
    confidence,
    generatedAt: generatedAt.toISOString(),
    validUntil: new Date(
      generatedAt.getTime() + ttlMinutes * 60_000,
    ).toISOString(),
    estimatorVersion: PARKING_ESTIMATOR_VERSION,
    factors,
  };
}
