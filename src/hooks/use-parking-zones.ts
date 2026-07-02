import { useEffect, useMemo, useState } from 'react';

import {
  fetchParkingZones,
  PARKING_ZONE_FIELDS,
  PARKING_ZONE_TABLE,
} from '@/services/parkingZones';
import type { ParkingZone } from '@/types/parking-zone';
import { parkingZonesToPolygons } from '@/utils/parking-zones';

export function useParkingZones() {
  const [zones, setZones] = useState<ParkingZone[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    void fetchParkingZones()
      .then((result) => {
        if (isActive) {
          setZones(result);
          setError(null);
        }
      })
      .catch((cause: unknown) => {
        if (isActive) {
          setZones([]);
          setError(
            cause instanceof Error
              ? cause.message
              : 'Unable to fetch parking zones.',
          );
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  const polygons = useMemo(() => parkingZonesToPolygons(zones), [zones]);

  useEffect(() => {
    if (!__DEV__ || isLoading) {
      return;
    }

    const diagnostics = {
      error,
      fields: PARKING_ZONE_FIELDS,
      firstPolygonCoordinateSample:
        polygons[0]?.coordinates[0] ?? null,
      firstZoneName: zones[0]?.name ?? null,
      nullGeojsonRows: zones.filter((zone) => zone.geojson === null).length,
      renderablePolygons: polygons.length,
      schema: 'public',
      table: PARKING_ZONE_TABLE,
      totalZonesFetched: zones.length,
    };

    if (error !== null || zones.length === 0 || polygons.length === 0) {
      console.warn(
        '[parking-map] Munich parking zones are not renderable',
        diagnostics,
      );
    } else {
      console.debug('[parking-map] Munich parking zones', diagnostics);
    }
  }, [error, isLoading, polygons, zones]);

  return {
    error,
    isLoading,
    polygons,
    zones,
  };
}
