import { COLORS } from '@/constants/theme';
import type { ProjectedParkingMarker } from '@/components/parking-map/marker-density';
import type { ParkingCoordinates } from '@/types/parking-domain';
import type { AvailabilityColorStatus } from '@/types/parking-map';

export type StreetAvailabilitySegment = {
  id: string;
  coordinates: ParkingCoordinates[];
  colorStatus: AvailabilityColorStatus;
};

export type StreetAvailabilityPolyline = {
  id: string;
  coordinates: ParkingCoordinates[];
  color: string;
  width: number;
};

/**
 * Uses only result bubbles that are projected into the current map viewport.
 * Segment coordinates come directly from the persisted source WKT; this function
 * never joins parking bubbles or fabricates a road path.
 */
export function buildStreetAvailabilitySegments(
  markers: ProjectedParkingMarker[],
  options: { activeSearchResults: boolean; mapHeight: number; mapWidth: number },
): StreetAvailabilitySegment[] {
  if (
    !options.activeSearchResults ||
    options.mapWidth <= 0 ||
    options.mapHeight <= 0
  ) {
    return [];
  }

  const seen = new Set<string>();
  return markers.flatMap(({ item, x, y, width, height }) => {
    const line = item.lineGeometry;
    if (
      item.type !== 'spot' ||
      item.colorStatus === 'neutral' ||
      !line ||
      line.length < 2 ||
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      x + width / 2 < 0 ||
      x - width / 2 > options.mapWidth ||
      y + height / 2 < 0 ||
      y - height / 2 > options.mapHeight ||
      seen.has(item.id) ||
      line.some(
        (point) =>
          !Number.isFinite(point.latitude) ||
          !Number.isFinite(point.longitude) ||
          Math.abs(point.latitude) > 90 ||
          Math.abs(point.longitude) > 180,
      )
    ) {
      return [];
    }

    seen.add(item.id);
    return [{ id: item.id, coordinates: line, colorStatus: item.colorStatus }];
  });
}

/** Bold, immediately-readable at a glance — matches the reference's visual weight far
 * better than a thin technical polyline. */
export const STREET_OVERLAY_LINE_WIDTH = 12;
/** Soft drop-shadow halo drawn under the bold line for contrast against light road
 * surfaces — the closest approximation of the reference's "subtle shadow" available on
 * this expo-maps version's polyline type (no native line-cap/shadow config exposed). */
export const STREET_OVERLAY_HALO_WIDTH = 16;
const STREET_OVERLAY_HALO_COLOR = 'rgba(30,30,30,0.14)';

const STREET_OVERLAY_COLOR_BY_STATUS: Record<AvailabilityColorStatus, string> = {
  green: COLORS.status.available,
  orange: COLORS.status.limited,
  red: COLORS.status.full,
  neutral: COLORS.status.unknown,
};

/** Builds the native-map polyline array for the search-results street-availability
 * overlay: one halo + one bold colored line per segment, halo first so the bold line
 * draws on top. Known limitation: this expo-maps version's polyline type exposes only
 * id/coordinates/color/width (+ iOS contourStyle: STRAIGHT/GEODESIC, Android geodesic) —
 * no line-cap or join config, so true rounded caps aren't reproducible here; the halo is
 * the available approximation for "soft, designed" rather than "thin, technical". */
export function buildStreetAvailabilityPolylines(
  segments: StreetAvailabilitySegment[],
): StreetAvailabilityPolyline[] {
  const halos = segments.map((segment) => ({
    id: `${segment.id}:halo`,
    coordinates: segment.coordinates,
    color: STREET_OVERLAY_HALO_COLOR,
    width: STREET_OVERLAY_HALO_WIDTH,
  }));
  const lines = segments.map((segment) => ({
    id: segment.id,
    coordinates: segment.coordinates,
    color: STREET_OVERLAY_COLOR_BY_STATUS[segment.colorStatus],
    width: STREET_OVERLAY_LINE_WIDTH,
  }));
  return [...halos, ...lines];
}
