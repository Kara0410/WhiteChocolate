import { mockParkingRecords } from '@/data/parking-records';
import { createParkingClusterEngine } from '@/services/parking-clustering';
import type { ParkingClusterRequest } from '@/types/parking-map';

// This alpha build is intentionally local-only. The immutable Supercluster
// indexes are built once from munich_parking.ts and reused for every viewport.
const mockClusterEngine = createParkingClusterEngine(mockParkingRecords);

export function getMockParkingClusters(request: ParkingClusterRequest) {
  return mockClusterEngine.getClusters(
    request.bbox,
    request.zoom,
    request.destination,
  );
}
