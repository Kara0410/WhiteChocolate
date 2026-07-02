import { useRef } from 'react';

import {
  deriveMapDetailLevel,
  type MapDetailLevel,
} from '@/components/parking-map/map-detail-level';
import type { ParkingCameraState } from '@/types/parking-map';

/**
 * Camera-derived detail level with hysteresis. The previous level is kept in
 * a ref (camera changes already re-render the map screen), so boundary
 * crossings use enter/exit thresholds instead of a single flickery cutoff.
 */
export function useMapDetailLevel(
  camera: Pick<ParkingCameraState, 'zoom' | 'longitudeDelta'>,
): MapDetailLevel {
  const previousLevelRef = useRef<MapDetailLevel | undefined>(undefined);
  const level = deriveMapDetailLevel(camera, previousLevelRef.current);
  previousLevelRef.current = level;
  return level;
}
