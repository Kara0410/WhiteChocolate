import type {
  ParkingCameraState,
  ParkingClusterResponse,
} from '@/types/parking-map';
import { getMarkerDimensions, getMarkerSizeTier } from './marker-visuals';

type MarkerDensityOptions = {
  camera: ParkingCameraState;
  width: number;
  height: number;
  selectedId?: string;
};

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
  const longitudeDelta =
    options.camera.longitudeDelta ??
    Math.max(0.000001, (360 / 2 ** options.camera.zoom) * 2);
  const latitudeDelta =
    options.camera.latitudeDelta ?? Math.max(0.000001, longitudeDelta * 1.6);
  const limit = markerLimitForZoom(options.camera.zoom);
  const projected: {
    item: ParkingClusterResponse;
    x: number;
    y: number;
    collisionRadius: number;
  }[] = items
    .map((item) => {
      const tier = getMarkerSizeTier(item.type, options.camera.zoom);
      const dimensions = getMarkerDimensions(
        tier,
        item.id === options.selectedId,
      );
      return {
        item,
        x:
          ((item.longitude -
            (options.camera.longitude - longitudeDelta / 2)) /
            longitudeDelta) *
          options.width,
        y:
          ((options.camera.latitude + latitudeDelta / 2 - item.latitude) /
            latitudeDelta) *
          options.height,
        collisionRadius: dimensions.visualSize / 2 + 6,
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
      const xDistance = candidate.x - existing.x;
      const yDistance = candidate.y - existing.y;
      const requiredDistance =
        candidate.collisionRadius + existing.collisionRadius;
      return xDistance ** 2 + yDistance ** 2 < requiredDistance ** 2;
    });
    if (!overlaps) {
      accepted.push(candidate);
    }
  }

  return accepted.map(({ item }) => item);
}
