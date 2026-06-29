export type Vehicle = {
  id: string;
  nickname: string;
  licensePlate: string;
  createdAt: string;
  updatedAt?: string;
};

export type VehicleInput = Pick<Vehicle, 'nickname' | 'licensePlate'>;

export type VehicleFieldErrors = Partial<
  Record<keyof VehicleInput, string>
>;
