import type { ParkingCameraState } from '@/types/parking-map';

/**
 * Strict three-level map detail model.
 *
 * - overview:    Munich-wide view. Zone polygons only, no count bubbles.
 * - zoneSummary: one capped "X Spots" / "50+ Spots" bubble per parking zone.
 * - spotDetail:  regular clusters and individual spot markers.
 */
export type MapDetailLevel = 'overview' | 'zoneSummary' | 'spotDetail';

/**
 * Web Mercator zoom thresholds with hysteresis. Enter and exit values are
 * intentionally different so the level cannot flicker while the user hovers
 * near a boundary: after entering a level the camera must move past the
 * *other* threshold of the pair to leave it again.
 *
 * Why these values:
 * - The Munich overview camera sits at zoom 11 and must classify as
 *   overview, so zoneSummary only starts at 12.0 (exit back at 11.5).
 * - Supercluster stops merging at zoom 16 (MAX_CLUSTER_ZOOM) and search /
 *   location flows land at zoom 16-17, so spotDetail starts at 15.0 where
 *   individual streets are readable (exit back at 14.5).
 */
export const MAP_DETAIL_THRESHOLDS = {
  /** overview -> zoneSummary while zooming in. */
  zoneSummaryEnterZoom: 12.0,
  /** zoneSummary -> overview while zooming out. */
  overviewReturnZoom: 11.5,
  /** zoneSummary -> spotDetail while zooming in. */
  spotDetailEnterZoom: 15.0,
  /** spotDetail -> zoneSummary while zooming out. */
  zoneSummaryReturnZoom: 14.5,
} as const;

/**
 * Zoom used for detail-level decisions. Prefers the zoom reported by the
 * Expo Maps camera event; falls back to an unrounded Web Mercator zoom
 * derived from longitudeDelta only when zoom is unavailable.
 */
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

export function deriveMapDetailLevel(
  camera: Pick<ParkingCameraState, 'zoom' | 'longitudeDelta'>,
  previousLevel?: MapDetailLevel,
): MapDetailLevel {
  const zoom = resolveDetailZoom(camera);
  if (zoom === null) {
    return previousLevel ?? 'overview';
  }

  const {
    overviewReturnZoom,
    spotDetailEnterZoom,
    zoneSummaryEnterZoom,
    zoneSummaryReturnZoom,
  } = MAP_DETAIL_THRESHOLDS;

  if (previousLevel === undefined) {
    if (zoom >= spotDetailEnterZoom) {
      return 'spotDetail';
    }
    return zoom >= zoneSummaryEnterZoom ? 'zoneSummary' : 'overview';
  }

  if (previousLevel === 'overview') {
    if (zoom < zoneSummaryEnterZoom) {
      return 'overview';
    }
    return zoom >= spotDetailEnterZoom ? 'spotDetail' : 'zoneSummary';
  }

  if (previousLevel === 'zoneSummary') {
    if (zoom >= spotDetailEnterZoom) {
      return 'spotDetail';
    }
    return zoom <= overviewReturnZoom ? 'overview' : 'zoneSummary';
  }

  if (zoom > zoneSummaryReturnZoom) {
    return 'spotDetail';
  }
  return zoom <= overviewReturnZoom ? 'overview' : 'zoneSummary';
}
