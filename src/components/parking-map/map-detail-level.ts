import type { ParkingCameraState } from '@/types/parking-map';

export type ParkingSemanticZoomStage =
  | 'city'
  | 'cell'
  | 'segmentCluster'
  | 'segment';

export const PARKING_SEMANTIC_ZOOM_THRESHOLDS = {
  cellEnter: 12.2,
  cityReturn: 11.8,
  segmentClusterEnter: 14.7,
  cellReturn: 14.3,
  segmentEnter: 16.2,
  segmentClusterReturn: 15.8,
} as const;

export function resolveDetailZoom(
  camera: Pick<ParkingCameraState, 'zoom' | 'longitudeDelta'>,
): number | null {
  if (Number.isFinite(camera.zoom)) {
    return camera.zoom;
  }
  if (
    camera.longitudeDelta !== undefined &&
    Number.isFinite(camera.longitudeDelta) &&
    camera.longitudeDelta > 0
  ) {
    return Math.log2(360 / camera.longitudeDelta);
  }
  return null;
}

function stageForZoom(zoom: number): ParkingSemanticZoomStage {
  const thresholds = PARKING_SEMANTIC_ZOOM_THRESHOLDS;
  if (zoom >= thresholds.segmentEnter) {
    return 'segment';
  }
  if (zoom >= thresholds.segmentClusterEnter) {
    return 'segmentCluster';
  }
  if (zoom >= thresholds.cellEnter) {
    return 'cell';
  }
  return 'city';
}

export function deriveParkingSemanticZoomStage(
  camera: Pick<ParkingCameraState, 'zoom' | 'longitudeDelta'>,
  previousStage?: ParkingSemanticZoomStage,
): ParkingSemanticZoomStage {
  const zoom = resolveDetailZoom(camera);
  if (zoom === null) {
    return previousStage ?? 'city';
  }
  if (previousStage === undefined) {
    return stageForZoom(zoom);
  }

  const thresholds = PARKING_SEMANTIC_ZOOM_THRESHOLDS;
  switch (previousStage) {
    case 'city':
      return zoom < thresholds.cellEnter ? 'city' : stageForZoom(zoom);
    case 'cell':
      if (zoom <= thresholds.cityReturn) {
        return 'city';
      }
      return zoom < thresholds.segmentClusterEnter
        ? 'cell'
        : stageForZoom(zoom);
    case 'segmentCluster':
      if (zoom <= thresholds.cellReturn) {
        if (zoom <= thresholds.cityReturn) {
          return 'city';
        }
        return 'cell';
      }
      return zoom < thresholds.segmentEnter
        ? 'segmentCluster'
        : 'segment';
    case 'segment':
      if (zoom > thresholds.segmentClusterReturn) {
        return 'segment';
      }
      if (zoom <= thresholds.cityReturn) {
        return 'city';
      }
      return zoom <= thresholds.cellReturn ? 'cell' : 'segmentCluster';
  }
}
