import type {
  ParkingCameraState,
  ParkingClusterResponse,
  ParkingCoordinates,
} from '@/types/parking-map';
import {
  createBufferedViewportBounds,
  getParkingRenderRadiusPixels,
  hasValidParkingCoordinates,
  isCoordinateInsideBounds,
} from '@/utils/parking-map-geo';
import {
  getMarkerDimensions,
  getMarkerSizeTier,
  type MarkerSizeTier,
} from './marker-visuals';

type MarkerDensityOptions = {
  camera: ParkingCameraState;
  width: number;
  height: number;
  selectedId?: string;
};

const MAX_MERCATOR_LATITUDE = 85.05112878;
const TILE_SIZE = 256;

export type ProjectedParkingMarker = {
  item: ParkingClusterResponse;
  x: number;
  y: number;
  width: number;
  height: number;
  tier: MarkerSizeTier;
};

export type ParkingViewportFilterResult = {
  bounds: ReturnType<typeof createBufferedViewportBounds>;
  markers: ParkingClusterResponse[];
  usedServerFallback: boolean;
};

export type ParkingCircleFilterResult = {
  markers: ParkingClusterResponse[];
  radiusMeters: number | null;
  radiusPixels: number | null;
  removedAllMarkers: boolean;
  usedServerFallback: boolean;
};

const EARTH_RADIUS_METERS = 6_371_000;

function getApproximateCircleRadiusMeters(
  camera: ParkingCameraState,
  height: number,
  radiusPixels: number | null,
) {
  if (
    radiusPixels === null ||
    !Number.isFinite(camera.zoom) ||
    height <= 0
  ) {
    return null;
  }

  if (
    camera.latitudeDelta !== undefined &&
    Number.isFinite(camera.latitudeDelta) &&
    camera.latitudeDelta > 0
  ) {
    return (
      radiusPixels *
      (camera.latitudeDelta / height) *
      (Math.PI / 180) *
      EARTH_RADIUS_METERS
    );
  }

  const latitudeRadians = (camera.latitude * Math.PI) / 180;
  const worldSize = TILE_SIZE * 2 ** camera.zoom;
  const metersPerPixel =
    (Math.cos(latitudeRadians) * 2 * Math.PI * EARTH_RADIUS_METERS) /
    worldSize;

  return radiusPixels * metersPerPixel;
}

export function filterParkingMarkersForViewport(
  items: ParkingClusterResponse[],
  camera: ParkingCameraState,
): ParkingViewportFilterResult {
  const validItems = items.filter(hasValidParkingCoordinates);
  const bounds = createBufferedViewportBounds(camera);

  if (bounds === null) {
    return {
      bounds,
      markers: validItems,
      usedServerFallback: validItems.length > 0,
    };
  }

  const filteredItems = validItems.filter((item) =>
    isCoordinateInsideBounds(item, bounds),
  );

  if (filteredItems.length === 0 && validItems.length > 0) {
    return {
      bounds,
      markers: validItems,
      usedServerFallback: true,
    };
  }

  return {
    bounds,
    markers: filteredItems,
    usedServerFallback: false,
  };
}

export function filterParkingMarkersForScreenCircle(
  items: ParkingClusterResponse[],
  options: Pick<MarkerDensityOptions, 'camera' | 'height' | 'width'>,
): ParkingCircleFilterResult {
  const validItems = items.filter(hasValidParkingCoordinates);
  const radiusPixels = getParkingRenderRadiusPixels({
    width: options.width,
    height: options.height,
  });
  const radiusMeters = getApproximateCircleRadiusMeters(
    options.camera,
    options.height,
    radiusPixels,
  );

  if (radiusPixels === null) {
    return {
      markers: validItems,
      radiusMeters,
      radiusPixels,
      removedAllMarkers: false,
      usedServerFallback: validItems.length > 0,
    };
  }

  const centerX = options.width / 2;
  const centerY = options.height / 2;
  let hasUsableProjection = false;
  const filteredItems = validItems.filter((item) => {
    const position = projectMapCoordinate(item, options);
    if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
      return false;
    }

    hasUsableProjection = true;
    return (
      Math.hypot(position.x - centerX, position.y - centerY) <= radiusPixels
    );
  });

  if (!hasUsableProjection && validItems.length > 0) {
    return {
      markers: validItems,
      radiusMeters,
      radiusPixels,
      removedAllMarkers: false,
      usedServerFallback: true,
    };
  }

  const removedAllMarkers =
    filteredItems.length === 0 && validItems.length > 0;

  return {
    markers: removedAllMarkers ? validItems : filteredItems,
    radiusMeters,
    radiusPixels,
    removedAllMarkers,
    usedServerFallback: removedAllMarkers,
  };
}

export function getDisplayedParkingMarkerItems(
  filteredItems: ParkingClusterResponse[],
  selectedItem: ParkingClusterResponse | null,
  searchItems: ParkingClusterResponse[] | null,
  suppressMarkers: boolean,
) {
  if (selectedItem !== null) {
    return [selectedItem];
  }
  if (searchItems !== null) {
    return searchItems;
  }
  if (suppressMarkers) {
    return [];
  }
  return filteredItems;
}

export function projectMapCoordinate(
  coordinates: ParkingCoordinates,
  options: Pick<MarkerDensityOptions, 'camera' | 'height' | 'width'>,
) {
  const { camera, height, width } = options;

  if (camera.longitudeDelta && camera.latitudeDelta) {
    return {
      x:
        ((coordinates.longitude -
          (camera.longitude - camera.longitudeDelta / 2)) /
          camera.longitudeDelta) *
        width,
      y:
        ((camera.latitude + camera.latitudeDelta / 2 -
          coordinates.latitude) /
          camera.latitudeDelta) *
        height,
    };
  }

  const worldSize = TILE_SIZE * 2 ** camera.zoom;
  const coordinateWorldX = ((coordinates.longitude + 180) / 360) * worldSize;
  const cameraWorldX = ((camera.longitude + 180) / 360) * worldSize;
  let worldXDelta = coordinateWorldX - cameraWorldX;

  if (worldXDelta > worldSize / 2) {
    worldXDelta -= worldSize;
  } else if (worldXDelta < -worldSize / 2) {
    worldXDelta += worldSize;
  }

  const latitudeToWorldY = (latitude: number) => {
    const clampedLatitude = Math.max(
      -MAX_MERCATOR_LATITUDE,
      Math.min(MAX_MERCATOR_LATITUDE, latitude),
    );
    const radians = (clampedLatitude * Math.PI) / 180;

    return (
      ((1 - Math.asinh(Math.tan(radians)) / Math.PI) / 2) *
      worldSize
    );
  };

  return {
    x: width / 2 + worldXDelta,
    y:
      height / 2 +
      latitudeToWorldY(coordinates.latitude) -
      latitudeToWorldY(camera.latitude),
  };
}

export function getMarkerLimitForZoom(zoom: number) {
  if (zoom <= 10) {
    return 20;
  }
  if (zoom <= 13) {
    return 50;
  }
  if (zoom <= 15) {
    return 90;
  }
  return 140;
}

/**
 * React Native overlay markers do not participate in map collision layouts.
 * This visual pass projects coordinates into approximate screen space and
 * suppresses lower-priority overlaps. It does not alter clusters or their
 * metadata; it only protects legibility at the current viewport.
 */
export function selectSpatiallySeparatedMarkers(
  items: ParkingClusterResponse[],
  options: MarkerDensityOptions,
) {
  const limit = getMarkerLimitForZoom(options.camera.zoom);
  const projected: ProjectedParkingMarker[] = items
    .map((item) => {
      const tier = getMarkerSizeTier(item.type, options.camera.zoom);
      const dimensions = getMarkerDimensions(tier);
      const position = projectMapCoordinate(item, options);
      return {
        item,
        x: position.x,
        y: position.y,
        width: dimensions.width + 4,
        height: dimensions.height + 4,
        tier,
      };
    })
    .sort((first, second) => {
      if (first.item.id === options.selectedId) {
        return -1;
      }
      if (second.item.id === options.selectedId) {
        return 1;
      }
      return (
        (second.item.spotCount ?? second.item.count) -
          (first.item.spotCount ?? first.item.count) ||
        second.item.availabilityPercent - first.item.availabilityPercent
      );
    });

  const accepted: typeof projected = [];
  for (const candidate of projected) {
    if (accepted.length >= limit) {
      break;
    }
    const overlaps = accepted.some((existing) => {
      return (
        Math.abs(candidate.x - existing.x) <
          (candidate.width + existing.width) / 2 &&
        Math.abs(candidate.y - existing.y) <
          (candidate.height + existing.height) / 2
      );
    });
    if (!overlaps) {
      accepted.push(candidate);
    }
  }

  return accepted.map(({ item }) => item);
}

export function projectParkingMarkers(
  items: ParkingClusterResponse[],
  options: MarkerDensityOptions,
) {
  const selected = selectSpatiallySeparatedMarkers(items, options);
  return projectSelectedParkingMarkers(selected, options);
}

/**
 * Projects an already density-filtered marker set. This is intentionally
 * separate from collision selection so live camera movement only performs
 * the cheap coordinate pass.
 */
export function projectSelectedParkingMarkers(
  items: ParkingClusterResponse[],
  options: Omit<MarkerDensityOptions, 'selectedId'>,
) {
  return items.map((item): ProjectedParkingMarker => {
    const tier = getMarkerSizeTier(item.type, options.camera.zoom);
    const dimensions = getMarkerDimensions(tier);
    const position = projectMapCoordinate(item, options);
    return {
      item,
      x: position.x,
      y: position.y,
      width: dimensions.width,
      height: dimensions.height,
      tier,
    };
  });
}
