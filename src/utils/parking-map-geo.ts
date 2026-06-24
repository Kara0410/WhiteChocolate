import type {
  AvailabilityColorStatus,
  ParkingBoundingBox,
  ParkingCameraState,
  ParkingClusterRequest,
  ParkingCoordinates,
  WalkingCategory,
} from '@/types/parking-map';

const MAX_MERCATOR_LATITUDE = 85.05112878;
const EARTH_RADIUS_METERS = 6_371_000;
const VIEWPORT_PADDING_FACTOR = 1.35;

export function clampZoom(zoom: number) {
  return Math.max(1, Math.min(20, Math.round(zoom)));
}

export function zoomFromLongitudeDelta(longitudeDelta: number) {
  return clampZoom(Math.log2(360 / Math.max(longitudeDelta, 0.000001)));
}

export function getAvailabilityColorStatus(percent: number): AvailabilityColorStatus {
  if (percent >= 65) {
    return 'green';
  }
  if (percent >= 30) {
    return 'orange';
  }
  return 'red';
}

export function longitudeToTileX(longitude: number, zoom: number) {
  return ((longitude + 180) / 360) * 2 ** zoom;
}

export function latitudeToTileY(latitude: number, zoom: number) {
  const clampedLatitude = Math.max(
    -MAX_MERCATOR_LATITUDE,
    Math.min(MAX_MERCATOR_LATITUDE, latitude),
  );
  const radians = (clampedLatitude * Math.PI) / 180;

  return (
    ((1 - Math.asinh(Math.tan(radians)) / Math.PI) / 2) *
    2 ** zoom
  );
}

export function tileXToLongitude(tileX: number, zoom: number) {
  return (tileX / 2 ** zoom) * 360 - 180;
}

export function tileYToLatitude(tileY: number, zoom: number) {
  const mercator = Math.PI * (1 - (2 * tileY) / 2 ** zoom);
  return (Math.atan(Math.sinh(mercator)) * 180) / Math.PI;
}

export function bboxContains(
  bbox: ParkingBoundingBox,
  latitude: number,
  longitude: number,
) {
  return (
    longitude >= bbox.minLng &&
    longitude <= bbox.maxLng &&
    latitude >= bbox.minLat &&
    latitude <= bbox.maxLat
  );
}

export function haversineDistanceMeters(
  first: ParkingCoordinates,
  second: ParkingCoordinates,
) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const latitudeDelta = toRadians(second.latitude - first.latitude);
  const longitudeDelta = toRadians(second.longitude - first.longitude);
  const firstLatitude = toRadians(first.latitude);
  const secondLatitude = toRadians(second.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return (
    2 *
    EARTH_RADIUS_METERS *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

export function getWalkingCategory(distanceMeters: number): WalkingCategory {
  if (distanceMeters <= 416) {
    return 'close';
  }
  if (distanceMeters <= 624) {
    return 'acceptable';
  }
  return 'far';
}

function tileAlignedBounds(camera: ParkingCameraState, zoom: number) {
  const fallbackLongitudeDelta = (360 / 2 ** zoom) * 2.5;
  const longitudeDelta = Math.max(
    camera.longitudeDelta ?? fallbackLongitudeDelta,
    0.000001,
  );
  const latitudeDelta = Math.max(
    camera.latitudeDelta ?? longitudeDelta * 1.6,
    0.000001,
  );
  const paddedLongitudeDelta = longitudeDelta * VIEWPORT_PADDING_FACTOR;
  const paddedLatitudeDelta = latitudeDelta * VIEWPORT_PADDING_FACTOR;
  const rawBounds: ParkingBoundingBox = {
    minLng: Math.max(-180, camera.longitude - paddedLongitudeDelta / 2),
    maxLng: Math.min(180, camera.longitude + paddedLongitudeDelta / 2),
    minLat: Math.max(
      -MAX_MERCATOR_LATITUDE,
      camera.latitude - paddedLatitudeDelta / 2,
    ),
    maxLat: Math.min(
      MAX_MERCATOR_LATITUDE,
      camera.latitude + paddedLatitudeDelta / 2,
    ),
  };
  const minTileX = Math.floor(longitudeToTileX(rawBounds.minLng, zoom));
  const maxTileX = Math.floor(longitudeToTileX(rawBounds.maxLng, zoom));
  const minTileY = Math.floor(latitudeToTileY(rawBounds.maxLat, zoom));
  const maxTileY = Math.floor(latitudeToTileY(rawBounds.minLat, zoom));

  return {
    minTileX,
    maxTileX,
    minTileY,
    maxTileY,
    bbox: {
      minLng: tileXToLongitude(minTileX, zoom),
      maxLng: tileXToLongitude(maxTileX + 1, zoom),
      minLat: tileYToLatitude(maxTileY + 1, zoom),
      maxLat: tileYToLatitude(minTileY, zoom),
    },
  };
}

export function getParkingClusterRequest(
  camera: ParkingCameraState,
  destination?: ParkingCoordinates,
): ParkingClusterRequest {
  const zoom = clampZoom(camera.zoom);
  const bounds = tileAlignedBounds(camera, zoom);
  const destinationKey = destination
    ? `:d${destination.latitude.toFixed(4)},${destination.longitude.toFixed(4)}`
    : '';

  return {
    zoom,
    destination,
    tileKey:
      `parking:clusters:z${zoom}:x${bounds.minTileX}-${bounds.maxTileX}` +
      `:y${bounds.minTileY}-${bounds.maxTileY}${destinationKey}`,
    bbox: bounds.bbox,
  };
}
