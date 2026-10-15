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

/** Uses the already-grouped search markers; no second deduplication occurs here. */
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

  return markers.flatMap(
    ({ item, x, y, width, height }): StreetAvailabilitySegment[] => {
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

      return [
        {
          id: item.id,
          coordinates: line,
          colorStatus: item.colorStatus,
        },
      ];
    },
  );
}

/** Road-filling visual weight at the recommendation zoom level. */
export const STREET_OVERLAY_LINE_WIDTH = 22;
/** A restrained contrast edge beneath the saturated road color. */
export const STREET_OVERLAY_HALO_WIDTH = 26;
const STREET_OVERLAY_HALO_COLOR = 'rgba(30,30,30,0.10)';

const STREET_OVERLAY_COLOR_BY_STATUS: Record<AvailabilityColorStatus, string> = {
  green: COLORS.status.available,
  orange: COLORS.status.limited,
  red: COLORS.status.full,
  neutral: COLORS.status.unknown,
};

/** Builds one halo and one saturated native line per consolidated corridor. The
 * installed expo-maps API exposes width but no line-cap/join control. */
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
