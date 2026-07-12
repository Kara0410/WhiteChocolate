import type {
  ParkingBoundingBox,
  ParkingCameraState,
  ParkingClusterRequest,
  ParkingCoordinates,
  ParkingMapSize,
  WalkingCategory,
} from '@/types/parking-map';
export { getAvailabilityColorStatus } from '@/utils/parking-availability';

const MAX_MERCATOR_LATITUDE = 85.05112878;
const EARTH_RADIUS_METERS = 6_371_000;
const WEB_MERCATOR_TILE_SIZE = 256;
const VIEWPORT_PADDING_FACTOR = 1.35;
const DEFAULT_RENDER_BUFFER_RATIO = 0.5;
const MAX_LATITUDE_BUFFER_DEGREES = 12;
const MAX_LONGITUDE_BUFFER_DEGREES = 24;

export const PARKING_RENDER_RADIUS_SCREEN_RATIO = 0.52;
export const PARKING_RENDER_FETCH_PADDING_RATIO = 1.2;
export const PARKING_SEARCH_FOCUS_ZOOM = 16;

export function hasValidParkingCoordinates(
  coordinates: ParkingCoordinates,
) {
  return (
    Number.isFinite(coordinates.latitude) &&
    coordinates.latitude >= -90 &&
    coordinates.latitude <= 90 &&
    Number.isFinite(coordinates.longitude) &&
    coordinates.longitude >= -180 &&
    coordinates.longitude <= 180
  );
}

export function clampZoom(zoom: number) {
  return Math.max(1, Math.min(20, Math.round(zoom)));
}

export function zoomFromLongitudeDelta(longitudeDelta: number) {
  return clampZoom(Math.log2(360 / Math.max(longitudeDelta, 0.000001)));
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
  const longitudeIsInside =
    bbox.minLng <= bbox.maxLng
      ? longitude >= bbox.minLng && longitude <= bbox.maxLng
      : longitude >= bbox.minLng || longitude <= bbox.maxLng;

  return (
    longitudeIsInside &&
    latitude >= bbox.minLat &&
    latitude <= bbox.maxLat
  );
}

export function createBufferedViewportBounds(
  camera: ParkingCameraState,
  bufferRatio = DEFAULT_RENDER_BUFFER_RATIO,
): ParkingBoundingBox | null {
  if (
    !hasValidParkingCoordinates(camera) ||
    !Number.isFinite(bufferRatio) ||
    bufferRatio < 0
  ) {
    return null;
  }

  const hasUsableZoom = Number.isFinite(camera.zoom);
  const zoom = hasUsableZoom ? clampZoom(camera.zoom) : null;
  const hasLongitudeDelta =
    Number.isFinite(camera.longitudeDelta) &&
    camera.longitudeDelta !== undefined &&
    camera.longitudeDelta > 0;
  const hasLatitudeDelta =
    Number.isFinite(camera.latitudeDelta) &&
    camera.latitudeDelta !== undefined &&
    camera.latitudeDelta > 0;
  if (!hasLongitudeDelta && zoom === null) {
    return null;
  }

  const fallbackLongitudeDelta =
    zoom === null ? null : (360 / 2 ** zoom) * 2.5;
  const resolvedLongitudeDelta = hasLongitudeDelta
    ? camera.longitudeDelta!
    : fallbackLongitudeDelta;
  if (resolvedLongitudeDelta === null) {
    return null;
  }

  const longitudeDelta = Math.min(
    360,
    Math.max(resolvedLongitudeDelta, 0.000001),
  );
  const latitudeDelta = Math.min(
    MAX_MERCATOR_LATITUDE * 2,
    Math.max(
      hasLatitudeDelta ? camera.latitudeDelta! : longitudeDelta * 1.6,
      0.000001,
    ),
  );
  const longitudeBuffer = Math.min(
    (longitudeDelta * bufferRatio) / 2,
    MAX_LONGITUDE_BUFFER_DEGREES,
  );
  const latitudeBuffer = Math.min(
    (latitudeDelta * bufferRatio) / 2,
    MAX_LATITUDE_BUFFER_DEGREES,
  );

  const longitudeSpan = longitudeDelta + longitudeBuffer * 2;
  const rawMinLongitude =
    camera.longitude - longitudeDelta / 2 - longitudeBuffer;
  const rawMaxLongitude =
    camera.longitude + longitudeDelta / 2 + longitudeBuffer;
  const minLng =
    longitudeSpan >= 360
      ? -180
      : rawMinLongitude < -180
        ? rawMinLongitude + 360
        : rawMinLongitude;
  const maxLng =
    longitudeSpan >= 360
      ? 180
      : rawMaxLongitude > 180
        ? rawMaxLongitude - 360
        : rawMaxLongitude;

  return {
    minLng,
    maxLng,
    minLat: Math.max(
      -MAX_MERCATOR_LATITUDE,
      camera.latitude - latitudeDelta / 2 - latitudeBuffer,
    ),
    maxLat: Math.min(
      MAX_MERCATOR_LATITUDE,
      camera.latitude + latitudeDelta / 2 + latitudeBuffer,
    ),
  };
}

export function getParkingRenderRadiusPixels(mapSize: ParkingMapSize) {
  if (
    !Number.isFinite(mapSize.width) ||
    !Number.isFinite(mapSize.height) ||
    mapSize.width <= 0 ||
    mapSize.height <= 0
  ) {
    return null;
  }

  return (
    PARKING_RENDER_RADIUS_SCREEN_RATIO *
    Math.min(mapSize.width, mapSize.height)
  );
}

export function deriveCameraViewportDeltas(
  camera: ParkingCameraState,
  mapSize: ParkingMapSize,
  provider: 'apple' | 'google',
) {
  if (
    !hasValidParkingCoordinates(camera) ||
    !Number.isFinite(camera.zoom) ||
    !Number.isFinite(mapSize.width) ||
    !Number.isFinite(mapSize.height) ||
    mapSize.width <= 0 ||
    mapSize.height <= 0
  ) {
    return null;
  }

  const zoom = Math.max(1, Math.min(20, camera.zoom));
  const longitudeDelta =
    camera.longitudeDelta !== undefined &&
    Number.isFinite(camera.longitudeDelta) &&
    camera.longitudeDelta > 0
      ? camera.longitudeDelta
      : provider === 'apple'
        ? 360 / 2 ** zoom
        : (mapSize.width * 360) /
          (WEB_MERCATOR_TILE_SIZE * 2 ** zoom);
  const centerTileY = latitudeToTileY(camera.latitude, 0);
  const halfWorldYSpan =
    ((longitudeDelta / 360) * (mapSize.height / mapSize.width)) / 2;
  const southLatitude = tileYToLatitude(centerTileY + halfWorldYSpan, 0);
  const northLatitude = tileYToLatitude(centerTileY - halfWorldYSpan, 0);

  return {
    latitudeDelta:
      camera.latitudeDelta !== undefined &&
      Number.isFinite(camera.latitudeDelta) &&
      camera.latitudeDelta > 0
        ? camera.latitudeDelta
        : northLatitude - southLatitude,
    longitudeDelta,
  };
}

export function createParkingSearchFocusCamera(
  destination: ParkingCoordinates,
  mapSize: ParkingMapSize,
  provider: 'apple' | 'google',
  coveredScreenRatio = 0.5,
): ParkingCameraState | null {
  if (
    !hasValidParkingCoordinates(destination) ||
    !Number.isFinite(coveredScreenRatio) ||
    coveredScreenRatio < 0 ||
    coveredScreenRatio >= 1
  ) {
    return null;
  }

  const viewportDeltas = deriveCameraViewportDeltas(
    {
      ...destination,
      zoom: PARKING_SEARCH_FOCUS_ZOOM,
    },
    mapSize,
    provider,
  );
  if (viewportDeltas === null) {
    return null;
  }

  const visibleScreenRatio = 1 - coveredScreenRatio;
  const desiredDestinationYRatio = visibleScreenRatio / 2;
  const latitudeOffsetRatio = 0.5 - desiredDestinationYRatio;

  return {
    latitude: Math.max(
      -MAX_MERCATOR_LATITUDE,
      Math.min(
        MAX_MERCATOR_LATITUDE,
        destination.latitude -
          viewportDeltas.latitudeDelta * latitudeOffsetRatio,
      ),
    ),
    longitude: destination.longitude,
    zoom: PARKING_SEARCH_FOCUS_ZOOM,
    latitudeDelta: viewportDeltas.latitudeDelta,
    longitudeDelta: viewportDeltas.longitudeDelta,
  };
}

export function createParkingRenderCircleBounds(
  camera: ParkingCameraState,
  mapSize: ParkingMapSize,
  fetchPaddingRatio = PARKING_RENDER_FETCH_PADDING_RATIO,
): ParkingBoundingBox | null {
  const radiusPixels = getParkingRenderRadiusPixels(mapSize);
  if (
    radiusPixels === null ||
    !hasValidParkingCoordinates(camera) ||
    !Number.isFinite(fetchPaddingRatio) ||
    fetchPaddingRatio < 1
  ) {
    return null;
  }

  const paddedRadiusPixels = radiusPixels * fetchPaddingRatio;
  const hasLongitudeDelta =
    camera.longitudeDelta !== undefined &&
    Number.isFinite(camera.longitudeDelta) &&
    camera.longitudeDelta > 0;
  const hasLatitudeDelta =
    camera.latitudeDelta !== undefined &&
    Number.isFinite(camera.latitudeDelta) &&
    camera.latitudeDelta > 0;
  const hasUsableZoom = Number.isFinite(camera.zoom);
  if ((!hasLongitudeDelta || !hasLatitudeDelta) && !hasUsableZoom) {
    return null;
  }

  const zoom = hasUsableZoom
    ? Math.max(1, Math.min(20, camera.zoom))
    : null;
  const worldSize =
    zoom === null ? null : WEB_MERCATOR_TILE_SIZE * 2 ** zoom;
  const longitudeRadius = hasLongitudeDelta
    ? paddedRadiusPixels * (camera.longitudeDelta! / mapSize.width)
    : paddedRadiusPixels * (360 / worldSize!);

  let minLat: number;
  let maxLat: number;
  if (hasLatitudeDelta) {
    const latitudeRadius =
      paddedRadiusPixels * (camera.latitudeDelta! / mapSize.height);
    minLat = camera.latitude - latitudeRadius;
    maxLat = camera.latitude + latitudeRadius;
  } else {
    const centerTileY = latitudeToTileY(camera.latitude, zoom!);
    const radiusInTiles = paddedRadiusPixels / WEB_MERCATOR_TILE_SIZE;
    minLat = tileYToLatitude(centerTileY + radiusInTiles, zoom!);
    maxLat = tileYToLatitude(centerTileY - radiusInTiles, zoom!);
  }

  return {
    minLng: Math.max(-180, camera.longitude - longitudeRadius),
    maxLng: Math.min(180, camera.longitude + longitudeRadius),
    minLat: Math.max(-MAX_MERCATOR_LATITUDE, minLat),
    maxLat: Math.min(MAX_MERCATOR_LATITUDE, maxLat),
  };
}

export function isCoordinateInsideBounds(
  coordinates: ParkingCoordinates,
  bounds: ParkingBoundingBox,
) {
  return bboxContains(
    bounds,
    coordinates.latitude,
    coordinates.longitude,
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

export function getParkingRenderCircleClusterRequest(
  camera: ParkingCameraState,
  mapSize: ParkingMapSize,
  destination?: ParkingCoordinates,
): ParkingClusterRequest | null {
  const bbox = createParkingRenderCircleBounds(camera, mapSize);
  if (bbox === null) {
    return null;
  }

  const zoom = clampZoom(camera.zoom);
  const destinationKey = destination
    ? `:d${destination.latitude.toFixed(4)},${destination.longitude.toFixed(4)}`
    : '';
  const bboxKey = [
    bbox.minLng,
    bbox.minLat,
    bbox.maxLng,
    bbox.maxLat,
  ]
    .map((value) => value.toFixed(5))
    .join(',');

  return {
    bbox,
    zoom,
    destination,
    tileKey: `parking:circle:z${zoom}:bbox${bboxKey}${destinationKey}`,
  };
}
