export type ParkingSegment = {
  id: string;
  street: string | null;
  capacity: number | null;
  description: string | null;
  groupName: string | null;
  parkregelName: string | null;
  prmName: string | null;
  geoportalClass: string | null;
  shape: string | null;
  lat: number;
  lon: number;
};
