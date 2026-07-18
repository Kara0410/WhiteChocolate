import { supabase } from '@/lib/supabase';
import { fetchParkingSegmentById } from '@/services/parkingSegments';
import type {
  ParkingBoundingBox,
  ParkingCellResolution,
  ParkingCellSummary,
  ParkingSegmentSummary,
  ParkingZoneSummary,
} from '@/types/parking-domain';
import type { ParkingSegment } from '@/types/parking-segment';
import {
  normalizeParkingCellSummaryRow,
  normalizeParkingSegmentSummaryRow,
  normalizeParkingZoneSummaryRow,
  parkingStringValue,
} from '@/utils/parking-map-data-normalizers';

const MAX_SEGMENT_SUMMARIES = 2_000;

function assertBounds(bounds: ParkingBoundingBox) {
  if (
    !Number.isFinite(bounds.minLng) ||
    !Number.isFinite(bounds.minLat) ||
    !Number.isFinite(bounds.maxLng) ||
    !Number.isFinite(bounds.maxLat) ||
    bounds.minLng >= bounds.maxLng ||
    bounds.minLat >= bounds.maxLat
  ) {
    throw new Error('Invalid parking map bounds.');
  }
}

export async function fetchParkingZoneSummaries(options?: {
  signal?: AbortSignal;
}): Promise<ParkingZoneSummary[]> {
  let query = supabase.from('parking_zone_summaries').select('*').order('zone_name');
  if (options?.signal) {
    query = query.abortSignal(options.signal);
  }
  const { data, error } = await query;
  if (error) {
    throw new Error(`Unable to fetch parking zone summaries: ${error.message}`);
  }
  return (data ?? []).flatMap((row) => {
    const summary = normalizeParkingZoneSummaryRow(row);
    return summary === null ? [] : [summary];
  });
}

export async function fetchParkingCells(input: {
  bounds: ParkingBoundingBox;
  contextHash: string | null;
  resolution: ParkingCellResolution;
  signal?: AbortSignal;
}): Promise<ParkingCellSummary[]> {
  assertBounds(input.bounds);
  const rpcArguments = {
    p_min_lng: input.bounds.minLng,
    p_min_lat: input.bounds.minLat,
    p_max_lng: input.bounds.maxLng,
    p_max_lat: input.bounds.maxLat,
    p_resolution: input.resolution,
  };
  let query =
    input.contextHash === null
      ? supabase.rpc('fetch_parking_cells', rpcArguments)
      : supabase.rpc('fetch_parking_cells', {
          ...rpcArguments,
          p_context_hash: input.contextHash,
        });
  if (input.signal) {
    query = query.abortSignal(input.signal);
  }
  const { data, error } = await query;
  if (error) {
    throw new Error(`Unable to fetch parking cells: ${error.message}`);
  }
  return (data ?? []).flatMap((row) => {
    const summary = normalizeParkingCellSummaryRow(row);
    return summary === null ? [] : [summary];
  });
}

export async function fetchParkingSegmentSummaries(input: {
  bounds: ParkingBoundingBox;
  signal?: AbortSignal;
}): Promise<{ segments: ParkingSegmentSummary[]; truncated: boolean }> {
  assertBounds(input.bounds);
  let query = supabase
    .from('parking_segment_summaries')
    .select('*')
    .gte('lat', input.bounds.minLat)
    .lte('lat', input.bounds.maxLat)
    .gte('lon', input.bounds.minLng)
    .lte('lon', input.bounds.maxLng)
    .order('id')
    .limit(MAX_SEGMENT_SUMMARIES + 1);
  if (input.signal) {
    query = query.abortSignal(input.signal);
  }
  const { data, error } = await query;
  if (error) {
    throw new Error(`Unable to fetch parking segments: ${error.message}`);
  }
  const rows = data ?? [];
  return {
    segments: rows.slice(0, MAX_SEGMENT_SUMMARIES).flatMap((row) => {
      const summary = normalizeParkingSegmentSummaryRow(row);
      return summary === null ? [] : [summary];
    }),
    truncated: rows.length > MAX_SEGMENT_SUMMARIES,
  };
}

function maximumStayMinutes(description: string | null) {
  const match = description?.match(/(\d+)\s*h/i);
  return match ? Number(match[1]) * 60 : null;
}

export async function fetchParkingSegmentDetails(
  segmentId: string,
  options?: { signal?: AbortSignal },
): Promise<ParkingSegment | null> {
  const id = segmentId.trim();
  if (!id) {
    return null;
  }

  let query = supabase
    .from('parking_segment_summaries')
    .select('*')
    .eq('id', id);
  if (options?.signal) {
    query = query.abortSignal(options.signal);
  }
  const { data, error } = await query.maybeSingle();
  if (error) {
    // The detail path remains usable during a backend-first rollout.
    if (error.code === '42P01' || error.code === 'PGRST205') {
      return fetchParkingSegmentById(id);
    }
    throw new Error(`Unable to fetch parking segment details: ${error.message}`);
  }
  if (data === null) {
    return null;
  }
  const summary = normalizeParkingSegmentSummaryRow(data);
  if (summary === null) {
    return null;
  }
  const description = parkingStringValue(data.regulation_description);
  return {
    ...summary,
    regulation: {
      description,
      groupName: parkingStringValue(data.regulation_group_name),
      name: parkingStringValue(data.regulation_name),
      maximumStayMinutes: maximumStayMinutes(description),
    },
    geoportalClass: parkingStringValue(data.geoportal_class),
  };
}
