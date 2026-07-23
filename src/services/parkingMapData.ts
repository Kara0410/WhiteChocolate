import { supabase } from '@/lib/supabase';
import type {
  ParkingBoundingBox,
  ParkingCellResolution,
  ParkingCellSummary,
  ParkingSegmentSummary,
} from '@/types/parking-domain';
import type { ParkingSegment } from '@/types/parking-segment';
import {
  normalizeParkingCellSummaryRows,
  normalizeParkingSegmentSummaryRows,
  parkingStringValue,
} from '@/utils/parking-map-data-normalizers';
import { buildParkingCellRpcCall } from '@/utils/parking-cell-rpc';

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

export async function fetchParkingCells(input: {
  bounds: ParkingBoundingBox;
  contextHash: string | null;
  resolution: ParkingCellResolution;
  signal?: AbortSignal;
}): Promise<ParkingCellSummary[]> {
  assertBounds(input.bounds);
  const rpcCall = buildParkingCellRpcCall(input);
  let query = supabase.rpc('fetch_parking_cells', rpcCall.arguments);
  if (input.signal) {
    query = query.abortSignal(input.signal);
  }
  const { data, error } = await query;
  if (error) {
    throw new Error(`Unable to fetch parking cells: ${error.message}`);
  }
  return normalizeParkingCellSummaryRows(data ?? []);
}

export async function fetchParkingSegmentSummaries(input: {
  bounds: ParkingBoundingBox;
  signal?: AbortSignal;
}): Promise<{ segments: ParkingSegmentSummary[]; truncated: boolean }> {
  assertBounds(input.bounds);
  let query = supabase
    .from('parking_segment_summaries')
    .select('*', { count: 'exact' })
    .gte('lat', input.bounds.minLat)
    .lte('lat', input.bounds.maxLat)
    .gte('lon', input.bounds.minLng)
    .lte('lon', input.bounds.maxLng)
    .order('id')
    .limit(MAX_SEGMENT_SUMMARIES + 1);
  if (input.signal) {
    query = query.abortSignal(input.signal);
  }
  const { count, data, error } = await query;
  if (error) {
    throw new Error(`Unable to fetch parking segments: ${error.message}`);
  }
  const rows = data ?? [];
  return {
    segments: normalizeParkingSegmentSummaryRows(
      rows.slice(0, MAX_SEGMENT_SUMMARIES),
    ),
    truncated:
      (count !== null && count > rows.length) ||
      rows.length > MAX_SEGMENT_SUMMARIES,
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
    throw new Error(`Unable to fetch parking segment details: ${error.message}`);
  }
  if (data === null) {
    return null;
  }
  const [summary] = normalizeParkingSegmentSummaryRows([data]);
  const description = parkingStringValue(data.regulation_description);
  return {
    ...summary,
    regulation: {
      description,
      groupName: parkingStringValue(data.regulation_group_name),
      name: parkingStringValue(data.regulation_name),
      maximumStayMinutes: maximumStayMinutes(description),
    },
    geoportalClass: summary.sourceClassification,
  };
}
