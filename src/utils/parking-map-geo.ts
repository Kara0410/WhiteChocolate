import type {
  AvailabilityColorStatus,
  ParkingBoundingBox,
  ParkingCameraState,
  ParkingClusterRequest,
} from '@/types/parking-map';

const MAX_MERCATOR_LATITUDE = 85.05112878;

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

export function getParkingClusterRequest(
  camera: ParkingCameraState,
): ParkingClusterRequest {
  const zoom = clampZoom(camera.zoom);
  const centerTileX = Math.floor(longitudeToTileX(camera.longitude, zoom));
  const centerTileY = Math.floor(latitudeToTileY(camera.latitude, zoom));
  const radius = zoom <= 11 ? 1 : 2;
  const minTileX = centerTileX - radius;
  const maxTileX = centerTileX + radius + 1;
  const minTileY = centerTileY - radius;
  const maxTileY = centerTileY + radius + 1;

  return {
    zoom,
    tileKey: `parking:clusters:z${zoom}:x${centerTileX}:y${centerTileY}:r${radius}`,
    bbox: {
      minLng: tileXToLongitude(minTileX, zoom),
      maxLng: tileXToLongitude(maxTileX, zoom),
      minLat: tileYToLatitude(maxTileY, zoom),
      maxLat: tileYToLatitude(minTileY, zoom),
    },
  };
}

export function serializeBbox(bbox: ParkingBoundingBox) {
  return [bbox.minLng, bbox.minLat, bbox.maxLng, bbox.maxLat]
    .map((value) => value.toFixed(6))
    .join(',');
}
