import {
  getParkingTimeBucket,
  PARKING_ESTIMATOR_TIME_ZONE,
  PARKING_ESTIMATOR_VERSION,
  type ParkingPricingStatus,
} from './parking-estimator.ts';
import type {
  EstimateParkingAvailabilityRequest,
  EstimateParkingCoordinates,
} from './parking-estimator-request.ts';

const EARTH_RADIUS_METERS = 6_371_000;
const FREE_PARKING_PATTERN = /\b(kostenlos|gebührenfrei|gebuhrenfrei|entgeltfrei|free)\b/i;
const PAID_PARKING_PATTERN = /\b(kurzzeitparken|mischparken|altstadt|kostenpflichtig|paid)\b/i;

export type ParkingSegmentEstimatorRow = {
  id: string;
  lat: number | null;
  lon: number | null;
  angebot: number | null;
  parkregel_gruppe: string | null;
  parkregel_name: string | null;
  parkregel_beschreibung: string | null;
};

function radians(value: number) {
  return (value * Math.PI) / 180;
}

export function distanceMeters(
  left: EstimateParkingCoordinates,
  right: EstimateParkingCoordinates,
) {
  const latitudeDelta = radians(right.latitude - left.latitude);
  const longitudeDelta = radians(right.longitude - left.longitude);
  const leftLatitude = radians(left.latitude);
  const rightLatitude = radians(right.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(leftLatitude) *
      Math.cos(rightLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;
  return Math.round(
    2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(haversine))),
  );
}

export function pricingForSegment(segment: ParkingSegmentEstimatorRow): {
  pricingStatus: ParkingPricingStatus;
  hourlyRate: number | null;
} {
  const regulation = [
    segment.parkregel_gruppe,
    segment.parkregel_name,
    segment.parkregel_beschreibung,
  ]
    .filter(Boolean)
    .join(' ');
  if (FREE_PARKING_PATTERN.test(regulation)) {
    return { pricingStatus: 'free', hourlyRate: null };
  }
  if (PAID_PARKING_PATTERN.test(regulation)) {
    const group = segment.parkregel_gruppe ?? '';
    const hourlyRate = group.startsWith('Kurzzeitparken')
      ? 2.5
      : group.startsWith('Mischparken')
        ? 2
        : group.startsWith('Altstadt')
          ? 3
          : null;
    return { pricingStatus: 'paid', hourlyRate };
  }
  return { pricingStatus: 'unknown', hourlyRate: null };
}

function berlinWeekday(date: Date) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: PARKING_ESTIMATOR_TIME_ZONE,
    weekday: 'short',
  }).format(date);
}

function roundedCoordinate(value: number) {
  return Number(value.toFixed(3));
}

export function parkingEstimateContextKey(
  request: EstimateParkingAvailabilityRequest,
) {
  const requestedAt = new Date(request.requestedAt);
  const destination = request.destination
    ? request.destination.placeId ??
      `${roundedCoordinate(request.destination.latitude)},${roundedCoordinate(request.destination.longitude)}`
    : 'none';
  return JSON.stringify({
    destination,
    estimatorVersion: PARKING_ESTIMATOR_VERSION,
    includeTraffic: Boolean(request.includeTraffic && request.origin),
    timeBucket: getParkingTimeBucket(requestedAt),
    weekday: berlinWeekday(requestedAt),
  });
}

export async function parkingEstimateContextHash(
  request: EstimateParkingAvailabilityRequest,
) {
  const bytes = new TextEncoder().encode(parkingEstimateContextKey(request));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
