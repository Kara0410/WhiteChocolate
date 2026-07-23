import type {
  ParkingAvailability,
  ParkingCoordinates,
  ParkingPricing,
  ParkingRegulation,
} from '@/types/parking-domain';

export type ParkingSegment = {
  id: string;
  cityCode: string;
  sourceRecordId: string | null;
  streetName: string | null;
  sourceAreaName: string | null;
  sourceGeometry: string | null;
  coordinates: ParkingCoordinates;
  capacity: number | null;
  pricing: ParkingPricing;
  availability: ParkingAvailability;
  regulation: ParkingRegulation;
  geoportalClass: string | null;
  updatedAt: string | null;
};
