import { useEffect, useMemo, useState } from 'react';

import { fetchParkingZones } from '@/services/parkingZones';
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

    console.debug('[parking-map] Munich parking zones', {
      error,
      firstPolygonCoordinateSample:
        polygons[0]?.coordinates[0] ?? null,
      firstZoneName: zones[0]?.name ?? null,
      renderablePolygons: polygons.length,
      totalZonesFetched: zones.length,
    });
  }, [error, isLoading, polygons, zones]);

  return {
    error,
    isLoading,
    polygons,
    zones,
  };
}
