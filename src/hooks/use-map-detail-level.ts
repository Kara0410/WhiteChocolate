import { useRef } from 'react';

import {
  deriveParkingSemanticZoomStage,
  type ParkingSemanticZoomStage,
} from '@/components/parking-map/map-detail-level';
import type { ParkingCameraState } from '@/types/parking-map';

/**
 * Camera-derived detail level with hysteresis. The previous level is kept in
 * a ref (camera changes already re-render the map screen), so boundary
 * crossings use enter/exit thresholds instead of a single flickery cutoff.
 */
export function useParkingSemanticZoomStage(
  camera: Pick<ParkingCameraState, 'zoom' | 'longitudeDelta'>,
): ParkingSemanticZoomStage {
  const previousLevelRef = useRef<ParkingSemanticZoomStage | undefined>(
    undefined,
  );
  const level = deriveParkingSemanticZoomStage(
    camera,
    previousLevelRef.current,
  );
  previousLevelRef.current = level;
  return level;
}
