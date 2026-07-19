import type {
  ParkingBoundingBox,
  ParkingCellResolution,
} from '@/types/parking-domain';

type ParkingCellRpcBaseArguments = {
  p_min_lng: number;
  p_min_lat: number;
  p_max_lng: number;
  p_max_lat: number;
  p_resolution: ParkingCellResolution;
};

export function buildParkingCellRpcCall(input: {
  bounds: ParkingBoundingBox;
  contextHash: string | null;
  resolution: ParkingCellResolution;
}):
  | { mode: 'legacy'; arguments: ParkingCellRpcBaseArguments }
  | {
      mode: 'context';
      arguments: ParkingCellRpcBaseArguments & { p_context_hash: string };
    } {
  const baseArguments: ParkingCellRpcBaseArguments = {
    p_min_lng: input.bounds.minLng,
    p_min_lat: input.bounds.minLat,
    p_max_lng: input.bounds.maxLng,
    p_max_lat: input.bounds.maxLat,
    p_resolution: input.resolution,
  };
  const contextHash = input.contextHash?.trim() || null;
  return contextHash === null
    ? { mode: 'legacy', arguments: baseArguments }
    : {
        mode: 'context',
        arguments: { ...baseArguments, p_context_hash: contextHash },
      };
}
