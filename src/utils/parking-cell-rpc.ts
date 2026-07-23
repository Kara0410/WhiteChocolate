import type {
  ParkingBoundingBox,
  ParkingCellResolution,
} from '@/types/parking-domain';

type ParkingCellRpcArguments = {
  p_min_lng: number;
  p_min_lat: number;
  p_max_lng: number;
  p_max_lat: number;
  p_resolution: ParkingCellResolution;
  p_context_hash: string | null;
};

export function buildParkingCellRpcCall(input: {
  bounds: ParkingBoundingBox;
  contextHash: string | null;
  resolution: ParkingCellResolution;
}): { arguments: ParkingCellRpcArguments } {
  const arguments_: ParkingCellRpcArguments = {
    p_min_lng: input.bounds.minLng,
    p_min_lat: input.bounds.minLat,
    p_max_lng: input.bounds.maxLng,
    p_max_lat: input.bounds.maxLat,
    p_resolution: input.resolution,
    p_context_hash: input.contextHash?.trim() || null,
  };
  return { arguments: arguments_ };
}
