import { memo } from 'react';

import { ClusterMarker } from '@/components/parking-map/cluster-marker';
import { IndividualSpotMarker } from '@/components/parking-map/individual-spot-marker';
import type { ParkingClusterResponse } from '@/types/parking-map';

export type AvailabilityMarkerProps = {
  item: ParkingClusterResponse;
  zoom: number;
};

export const AvailabilityMarker = memo(function AvailabilityMarker({
  item,
  zoom,
}: AvailabilityMarkerProps) {
  if (item.type === 'spot') {
    return <IndividualSpotMarker item={item} zoom={zoom} />;
  }

  return <ClusterMarker item={item} zoom={zoom} />;
});
