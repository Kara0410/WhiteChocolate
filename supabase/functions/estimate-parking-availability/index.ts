import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.109.0';

import { resolveParkingDemandContext } from '../_shared/parking-demand-context.ts';
import { batchParkingEstimatorValues } from '../_shared/parking-estimator-batches.ts';
import {
  distanceMeters,
  parkingEstimateContextHash,
  pricingForSegment,
  type ParkingSegmentEstimatorRow,
} from '../_shared/parking-estimator-context.ts';
import {
  estimateParkingAvailability,
  PARKING_ESTIMATOR_VERSION,
  type ParkingAvailabilityEstimate,
  type ParkingDemandCategory,
  type ParkingEstimateFactor,
} from '../_shared/parking-estimator.ts';
import {
  EstimateRequestError,
  MAX_ESTIMATION_SEGMENTS,
  parseEstimateParkingAvailabilityRequest,
} from '../_shared/parking-estimator-request.ts';
import { partitionParkingSnapshots } from '../_shared/parking-snapshot-cache.ts';

const corsHeaders = {
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
};

type SnapshotRow = {
  segment_id: string;
  availability_percent: number | null;
  available_spaces: number | null;
  status: 'estimated' | 'unknown';
  confidence: 'low' | 'medium';
  estimator_version: string;
  generated_at: string;
  valid_until: string;
  factor_summary: ParkingEstimateFactor[] | null;
  destination_category: ParkingDemandCategory | null;
  traffic_ratio: number | null;
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function snapshotEstimate(row: SnapshotRow): ParkingAvailabilityEstimate {
  return {
    segmentId: row.segment_id,
    availableSpaces: row.available_spaces,
    availabilityPercent: row.availability_percent,
    status: row.status,
    confidence: row.confidence,
    estimatorVersion: row.estimator_version,
    generatedAt: row.generated_at,
    validUntil: row.valid_until,
    factors: Array.isArray(row.factor_summary) ? row.factor_summary : [],
  };
}

function validSegmentRow(value: unknown): value is ParkingSegmentEstimatorRow {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === 'string' &&
    (row.lat === null || typeof row.lat === 'number') &&
    (row.lon === null || typeof row.lon === 'number') &&
    (row.angebot === null || typeof row.angebot === 'number')
  );
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') {
    return json({ ok: false, code: 'METHOD_NOT_ALLOWED' }, 405);
  }

  const startedAt = performance.now();
  try {
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      throw new EstimateRequestError(
        'INVALID_JSON',
        'Request body must contain valid JSON.',
      );
    }
    const input = parseEstimateParkingAvailabilityRequest(rawBody);
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      return json({ ok: false, code: 'SERVICE_UNAVAILABLE' }, 503);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: rawSegments, error: segmentError } = await admin
      .from('parking_segments')
      .select(
        'id,lat,lon,angebot,parkregel_gruppe,parkregel_name,parkregel_beschreibung',
      )
      .gte('lat', input.bounds.minLat)
      .lte('lat', input.bounds.maxLat)
      .gte('lon', input.bounds.minLng)
      .lte('lon', input.bounds.maxLng)
      .limit(MAX_ESTIMATION_SEGMENTS + 1);
    if (segmentError) {
      console.error('parking-estimator database-read-failed', {
        latencyMs: Math.round(performance.now() - startedAt),
      });
      return json({ ok: false, code: 'PARKING_READ_FAILED' }, 500);
    }
    const segments = (rawSegments ?? []).filter(validSegmentRow);
    if (segments.length > MAX_ESTIMATION_SEGMENTS) {
      return json(
        {
          ok: false,
          code: 'TOO_MANY_SEGMENTS',
          maximumSegments: MAX_ESTIMATION_SEGMENTS,
        },
        413,
      );
    }
    if (segments.length === 0) {
      return json({
        ok: true,
        contextHash: await parkingEstimateContextHash(input),
        estimatorVersion: PARKING_ESTIMATOR_VERSION,
        estimates: [],
        reusedCount: 0,
        generatedCount: 0,
        providerStatus: {
          place: 'not-requested',
          nearby: 'not-requested',
          routes: 'not-requested',
        },
      });
    }

    const contextHash = await parkingEstimateContextHash(input);
    const segmentIds = segments.map((segment) => segment.id);
    const now = new Date();
    const snapshots: SnapshotRow[] = [];
    for (const segmentIdBatch of batchParkingEstimatorValues(segmentIds)) {
      const { data, error } = await admin
        .from('parking_availability_estimates')
        .select(
          'segment_id,availability_percent,available_spaces,status,confidence,estimator_version,generated_at,valid_until,factor_summary,destination_category,traffic_ratio',
        )
        .eq('context_hash', contextHash)
        .eq('estimator_version', PARKING_ESTIMATOR_VERSION)
        .in('segment_id', segmentIdBatch);
      if (error) {
        console.error('parking-estimator snapshot-read-failed', {
          databaseCode: error.code,
          segmentBatchSize: segmentIdBatch.length,
          latencyMs: Math.round(performance.now() - startedAt),
        });
        return json({ ok: false, code: 'SNAPSHOT_READ_FAILED' }, 500);
      }
      snapshots.push(...((data ?? []) as SnapshotRow[]));
    }
    const { reusableBySegment: snapshotBySegment } =
      partitionParkingSnapshots(
        segmentIds,
        snapshots,
        PARKING_ESTIMATOR_VERSION,
        now,
      );
    const missingSegments = segments.filter(
      (segment) => !snapshotBySegment.has(segment.id),
    );
    const demand =
      missingSegments.length > 0
        ? await resolveParkingDemandContext(
            input,
            Deno.env.get('GOOGLE_MAPS_SERVER_API_KEY') ?? null,
          )
        : null;
    const generated = missingSegments.map((segment) => {
      const pricing = pricingForSegment(segment);
      const segmentLocation =
        segment.lat !== null && segment.lon !== null
          ? { latitude: segment.lat, longitude: segment.lon }
          : null;
      return estimateParkingAvailability({
        segmentId: segment.id,
        capacity: segment.angebot,
        regulationGroup: segment.parkregel_gruppe,
        regulationName: segment.parkregel_name,
        regulationDescription: segment.parkregel_beschreibung,
        ...pricing,
        localDateTime: new Date(input.requestedAt),
        generatedAt: now,
        destinationDistanceMeters:
          input.destination && segmentLocation
            ? distanceMeters(segmentLocation, input.destination)
            : null,
        destinationPrimaryType: demand?.destinationPrimaryType ?? null,
        destinationTypes: demand?.destinationTypes ?? [],
        destinationIsOpen: demand?.destinationIsOpen ?? null,
        destinationRatingCount: demand?.destinationRatingCount ?? null,
        nearbyPoiCount: demand?.nearbyPoiCount ?? null,
        trafficRatio: demand?.trafficRatio ?? null,
        precipitationIntensity: null,
      });
    });

    if (generated.length > 0) {
      const destinationCategory = demand?.destinationCategory ?? 'unknown';
      const rows = generated.map((estimate) => ({
        segment_id: estimate.segmentId,
        availability_percent: estimate.availabilityPercent,
        available_spaces: estimate.availableSpaces,
        status: estimate.status,
        confidence: estimate.confidence,
        estimator_version: estimate.estimatorVersion,
        generated_at: estimate.generatedAt,
        valid_until: estimate.validUntil,
        context_hash: contextHash,
        factor_summary: estimate.factors,
        destination_place_id: input.destination?.placeId ?? null,
        destination_category: destinationCategory,
        destination_is_open: demand?.destinationIsOpen ?? null,
        traffic_ratio: demand?.trafficRatio ?? null,
      }));
      for (const rowBatch of batchParkingEstimatorValues(rows)) {
        const { error: writeError } = await admin
          .from('parking_availability_estimates')
          .upsert(rowBatch, {
            onConflict: 'segment_id,context_hash,estimator_version',
          });
        if (writeError) {
          console.error('parking-estimator snapshot-write-failed', {
            databaseCode: writeError.code,
            generatedCount: generated.length,
            rowBatchSize: rowBatch.length,
            latencyMs: Math.round(performance.now() - startedAt),
          });
          return json({ ok: false, code: 'SNAPSHOT_WRITE_FAILED' }, 500);
        }
      }
    }

    const generatedBySegment = new Map(
      generated.map((estimate) => [estimate.segmentId, estimate]),
    );
    const estimates = segments.map((segment) => {
      const snapshot = snapshotBySegment.get(segment.id);
      return snapshot
        ? snapshotEstimate(snapshot)
        : generatedBySegment.get(segment.id)!;
    });
    const providerStatus = demand
      ? {
          place: demand.placeStatus,
          nearby: demand.nearbyStatus,
          routes: demand.routesStatus,
        }
      : {
          place: 'not-requested',
          nearby: 'not-requested',
          routes: 'not-requested',
        };
    console.log('parking-estimator completed', {
      segmentCount: segments.length,
      reusedCount: snapshotBySegment.size,
      generatedCount: generated.length,
      providerStatus,
      latencyMs: Math.round(performance.now() - startedAt),
    });
    return json({
      ok: true,
      contextHash,
      estimatorVersion: PARKING_ESTIMATOR_VERSION,
      estimates,
      reusedCount: snapshotBySegment.size,
      generatedCount: generated.length,
      providerStatus,
    });
  } catch (error) {
    if (error instanceof EstimateRequestError) {
      return json(
        { ok: false, code: error.code, message: error.message },
        error.status,
      );
    }
    console.error('parking-estimator unhandled-error', {
      latencyMs: Math.round(performance.now() - startedAt),
    });
    return json({ ok: false, code: 'INTERNAL_ERROR' }, 500);
  }
});
