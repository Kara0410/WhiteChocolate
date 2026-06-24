import { useCallback, useState } from 'react';

import { ParkingMap } from '@/components/parking-map/parking-map';
import type { ParkingClusterResponse } from '@/types/parking-map';

const INITIAL_CAMERA = {
  latitude: 48.1351,
  longitude: 11.5824,
  zoom: 17,
} as const;

export default function MapScreen() {
  const [, setSelectedParkingItem] =
    useState<ParkingClusterResponse | null>(null);
  const handleSelectionChange = useCallback(
    (item: ParkingClusterResponse | null) => {
      setSelectedParkingItem(item);
    },
    [],
  );

  return (
    <ParkingMap
      initialCamera={INITIAL_CAMERA}
      onSelectedParkingItemChange={handleSelectionChange}
    />
  );
}
