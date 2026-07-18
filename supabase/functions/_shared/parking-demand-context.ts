import {
  mapGoogleTypesToDemandCategory,
  type ParkingDemandCategory,
} from './parking-estimator.ts';
import type {
  EstimateParkingAvailabilityRequest,
  EstimateParkingCoordinates,
} from './parking-estimator-request.ts';

const PLACES_TIMEOUT_MS = 2_500;
const ROUTES_TIMEOUT_MS = 2_500;
const NEARBY_RADIUS_METERS = 600;
const NEARBY_RESULT_LIMIT = 20;

export type ProviderCallStatus =
  | 'not-requested'
  | 'ok'
  | 'api-key-missing'
  | 'timeout'
  | 'quota-or-rate-limit'
  | 'provider-error'
  | 'malformed-response';

export type ParkingDemandContext = {
  destinationPrimaryType: string | null;
  destinationTypes: string[];
  destinationCategory: ParkingDemandCategory;
  destinationIsOpen: boolean | null;
  destinationRatingCount: number | null;
  nearbyPoiCount: number | null;
  trafficRatio: number | null;
  placeStatus: ProviderCallStatus;
  nearbyStatus: ProviderCallStatus;
  routesStatus: ProviderCallStatus;
};

type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

type GooglePlace = {
  id?: unknown;
  primaryType?: unknown;
  types?: unknown;
  currentOpeningHours?: { openNow?: unknown } | null;
  regularOpeningHours?: { openNow?: unknown } | null;
  userRatingCount?: unknown;
};

function emptyContext(): ParkingDemandContext {
  return {
    destinationPrimaryType: null,
    destinationTypes: [],
    destinationCategory: 'unknown',
    destinationIsOpen: null,
    destinationRatingCount: null,
    nearbyPoiCount: null,
    trafficRatio: null,
    placeStatus: 'not-requested',
    nearbyStatus: 'not-requested',
    routesStatus: 'not-requested',
  };
}

function stringValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : null;
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function nonNegativeInteger(value: unknown) {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
    ? value
    : null;
}

function openNow(place: GooglePlace) {
  const value =
    place.currentOpeningHours?.openNow ?? place.regularOpeningHours?.openNow;
  return typeof value === 'boolean' ? value : null;
}

function providerStatus(response: Response): ProviderCallStatus {
  if (response.status === 429 || response.status === 403) {
    return 'quota-or-rate-limit';
  }
  return 'provider-error';
}

async function providerJson(
  fetchImpl: FetchLike,
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<
  | { ok: true; value: unknown }
  | { ok: false; status: ProviderCallStatus }
> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      ...init,
      signal: controller.signal,
    });
    if (!response.ok) return { ok: false, status: providerStatus(response) };
    try {
      return { ok: true, value: await response.json() };
    } catch {
      return { ok: false, status: 'malformed-response' };
    }
  } catch (error) {
    return {
      ok: false,
      status:
        error instanceof DOMException && error.name === 'AbortError'
          ? 'timeout'
          : 'provider-error',
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function resolvePlaceDetails(
  placeId: string,
  apiKey: string,
  fetchImpl: FetchLike,
) {
  const response = await providerJson(
    fetchImpl,
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
    {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask':
          'id,primaryType,types,currentOpeningHours.openNow,regularOpeningHours.openNow,userRatingCount',
      },
    },
    PLACES_TIMEOUT_MS,
  );
  if (!response.ok) return response;
  if (!response.value || typeof response.value !== 'object') {
    return { ok: false as const, status: 'malformed-response' as const };
  }
  const place = response.value as GooglePlace;
  const primaryType = stringValue(place.primaryType);
  const types = stringArray(place.types);
  return {
    ok: true as const,
    value: {
      primaryType,
      types,
      category: mapGoogleTypesToDemandCategory(primaryType, types),
      isOpen: openNow(place),
      ratingCount: nonNegativeInteger(place.userRatingCount),
    },
  };
}

function dominantNearbyCategory(places: GooglePlace[]) {
  const counts = new Map<ParkingDemandCategory, number>();
  for (const place of places) {
    const category = mapGoogleTypesToDemandCategory(
      stringValue(place.primaryType),
      stringArray(place.types),
    );
    if (category !== 'unknown') {
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? 'unknown';
}

async function resolveNearbyContext(
  destination: EstimateParkingCoordinates,
  apiKey: string,
  fetchImpl: FetchLike,
) {
  const response = await providerJson(
    fetchImpl,
    'https://places.googleapis.com/v1/places:searchNearby',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.primaryType,places.types',
      },
      body: JSON.stringify({
        maxResultCount: NEARBY_RESULT_LIMIT,
        rankPreference: 'POPULARITY',
        locationRestriction: {
          circle: {
            center: {
              latitude: destination.latitude,
              longitude: destination.longitude,
            },
            radius: NEARBY_RADIUS_METERS,
          },
        },
      }),
    },
    PLACES_TIMEOUT_MS,
  );
  if (!response.ok) return response;
  const value = response.value as { places?: unknown } | null;
  if (!value || !Array.isArray(value.places)) {
    return { ok: false as const, status: 'malformed-response' as const };
  }
  const places = value.places.filter(
    (place): place is GooglePlace => typeof place === 'object' && place !== null,
  );
  return {
    ok: true as const,
    value: {
      category: dominantNearbyCategory(places),
      poiCount: places.length,
    },
  };
}

function durationSeconds(value: unknown) {
  if (typeof value !== 'string' || !/^\d+(?:\.\d+)?s$/.test(value)) return null;
  const seconds = Number(value.slice(0, -1));
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
}

async function resolveTrafficRatio(
  origin: EstimateParkingCoordinates,
  destination: EstimateParkingCoordinates,
  apiKey: string,
  fetchImpl: FetchLike,
) {
  const response = await providerJson(
    fetchImpl,
    'https://routes.googleapis.com/directions/v2:computeRoutes',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask':
          'routes.duration,routes.staticDuration,routes.distanceMeters',
      },
      body: JSON.stringify({
        origin: { location: { latLng: origin } },
        destination: { location: { latLng: destination } },
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
      }),
    },
    ROUTES_TIMEOUT_MS,
  );
  if (!response.ok) return response;
  const value = response.value as { routes?: unknown } | null;
  if (!value || !Array.isArray(value.routes) || !value.routes[0]) {
    return { ok: false as const, status: 'malformed-response' as const };
  }
  const route = value.routes[0] as Record<string, unknown>;
  const duration = durationSeconds(route.duration);
  const staticDuration = durationSeconds(route.staticDuration);
  if (duration === null || staticDuration === null) {
    return { ok: false as const, status: 'malformed-response' as const };
  }
  return {
    ok: true as const,
    value: Math.max(0.5, Math.min(3, duration / Math.max(staticDuration, 1))),
  };
}

export async function resolveParkingDemandContext(
  request: EstimateParkingAvailabilityRequest,
  apiKey: string | null,
  fetchImpl: FetchLike = fetch,
): Promise<ParkingDemandContext> {
  const context = emptyContext();
  if (!request.destination) return context;
  if (!apiKey) {
    context.placeStatus = request.destination.placeId
      ? 'api-key-missing'
      : 'not-requested';
    context.nearbyStatus = request.destination.placeId
      ? 'not-requested'
      : 'api-key-missing';
    context.routesStatus =
      request.includeTraffic && request.origin
        ? 'api-key-missing'
        : 'not-requested';
    return context;
  }

  if (request.destination.placeId) {
    const place = await resolvePlaceDetails(
      request.destination.placeId,
      apiKey,
      fetchImpl,
    );
    context.placeStatus = place.ok ? 'ok' : place.status;
    if (place.ok) {
      context.destinationPrimaryType = place.value.primaryType;
      context.destinationTypes = place.value.types;
      context.destinationCategory = place.value.category;
      context.destinationIsOpen = place.value.isOpen;
      context.destinationRatingCount = place.value.ratingCount;
    }
  }

  if (context.destinationCategory === 'unknown') {
    const nearby = await resolveNearbyContext(
      request.destination,
      apiKey,
      fetchImpl,
    );
    context.nearbyStatus = nearby.ok ? 'ok' : nearby.status;
    if (nearby.ok) {
      context.destinationCategory = nearby.value.category;
      context.nearbyPoiCount = nearby.value.poiCount;
    }
  }

  if (request.includeTraffic && request.origin) {
    const traffic = await resolveTrafficRatio(
      request.origin,
      request.destination,
      apiKey,
      fetchImpl,
    );
    context.routesStatus = traffic.ok ? 'ok' : traffic.status;
    if (traffic.ok) context.trafficRatio = traffic.value;
  }

  return context;
}
