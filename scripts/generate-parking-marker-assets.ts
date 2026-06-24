import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { AvailabilityColorStatus } from '../src/types/parking-map';
import { createParkingMarkerPng } from '../src/utils/parking-marker-png';

const outputDirectory = join(
  process.cwd(),
  'assets',
  'images',
  'parking-markers',
);
const statuses: AvailabilityColorStatus[] = ['green', 'orange', 'red'];

mkdirSync(outputDirectory, { recursive: true });

for (const status of statuses) {
  for (const type of ['cluster', 'spot'] as const) {
    const png = createParkingMarkerPng({
      type,
      colorStatus: status,
      availabilityPercent:
        status === 'green' ? 75 : status === 'orange' ? 45 : 15,
      zoneCount: 1,
      totalCapacity: 1,
      availableSpots: 1,
      minPrice: null,
      zoom: type === 'cluster' ? 14 : 18,
    });
    writeFileSync(join(outputDirectory, `${type}-${status}.png`), png);
  }
}
