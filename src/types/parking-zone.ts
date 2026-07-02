import type { ParkingCoordinates } from '@/types/parking-map';

export type ParkingZone = {
  id: string;
  name: string | null;
  status: string | null;
  massnahme: string | null;
  geojson: unknown;
};

export type ParkingZonePolygon = {
  id: string;
  zoneId: string;
  zoneName: string | null;
  coordinates: ParkingCoordinates[];
};
