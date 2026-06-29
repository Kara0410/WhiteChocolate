import type {
  ParkingCameraState,
  ParkingClusterResponse,
  ParkingCoordinates,
} from '@/types/parking-map';
import { getMarkerDimensions, getMarkerSizeTier } from './marker-visuals';

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
};

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

function markerLimitForZoom(zoom: number) {
  if (zoom <= 10) {
    return 20;
  }
  if (zoom <= 13) {
    return 40;
  }
  if (zoom <= 15) {
    return 64;
  }
  return 96;
}

/**
 * Expo Maps renders markers natively, so React Native collision layouts do
 * not apply. This visual pass projects coordinates into approximate screen
 * space and suppresses lower-priority overlaps. It does not alter clusters or
 * their metadata; it only protects legibility at the current viewport.
 */
export function selectSpatiallySeparatedMarkers(
  items: ParkingClusterResponse[],
  options: MarkerDensityOptions,
) {
  const limit = markerLimitForZoom(options.camera.zoom);
  const projected: ProjectedParkingMarker[] = items
    .map((item) => {
      const tier = getMarkerSizeTier(item.type, options.camera.zoom);
      const dimensions = getMarkerDimensions(tier);
      const position = projectMapCoordinate(item, options);
      return {
        item,
        x: position.x,
        y: position.y,
        width: dimensions.width + 12,
        height: dimensions.height + 12,
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
  return selected.map((item): ProjectedParkingMarker => {
    const dimensions = getMarkerDimensions(
      getMarkerSizeTier(item.type, options.camera.zoom),
    );
    const position = projectMapCoordinate(item, options);
    return {
      item,
      x: position.x,
      y: position.y,
      width: dimensions.width,
      height: dimensions.height,
    };
  });
}
