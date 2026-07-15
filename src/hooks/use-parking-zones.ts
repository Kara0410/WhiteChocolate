import { useEffect, useMemo, useState } from 'react';

import {
  fetchParkingZones,
  PARKING_ZONE_FIELDS,
  PARKING_ZONE_TABLE,
} from '@/services/parkingZones';
import type { ParkingAdministrativeZone } from '@/types/parking-domain';
import { parkingAdministrativeZonesToPolygons } from '@/utils/parking-zones';
import { logAppError, normalizeAppError } from '@/utils/app-errors';

export function useParkingZones() {
  const [zones, setZones] = useState<ParkingAdministrativeZone[]>([]);
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
          setError(normalizeAppError(cause, 'parking-data').message);
          logAppError('parking-data', cause, { source: 'parking-zones' });
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

  const polygons = useMemo(
    () => parkingAdministrativeZonesToPolygons(zones),
    [zones],
  );

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
    administrativeZones: zones,
    zones,
  };
}
