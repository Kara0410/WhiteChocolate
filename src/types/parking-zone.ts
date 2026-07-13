import type {
  GeoJsonMultiPolygon,
  GeoJsonPolygon,
  ParkingCoordinates,
} from '@/types/parking-domain';

export type ParkingZone = {
  id: string;
  name: string | null;
  status: string | null;
  massnahme: string | null;
  geojson: unknown;
  updatedAt?: string | null;
};

export type ParkingZoneGeometry = GeoJsonPolygon | GeoJsonMultiPolygon;

export type ParkingZonePolygon = {
  id: string;
  zoneId: string;
  zoneName: string | null;
  coordinates: ParkingCoordinates[];
};
