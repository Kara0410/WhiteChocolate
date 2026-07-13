import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { Platform } from 'react-native';

import {
  deriveParkingSemanticZoomStage,
  type ParkingSemanticZoomStage,
} from '@/components/parking-map/map-detail-level';
import { useParkingSemanticZoomStage } from '@/hooks/use-map-detail-level';
import { clusterParkingSegmentFeatures } from '@/services/parking-feature-clustering';
import {
  fetchParkingCells,
  fetchParkingSegmentSummaries,
  fetchParkingZoneSummaries,
} from '@/services/parkingMapData';
import { fetchParkingSegments } from '@/services/parkingSegments';
import type {
  ParkingBoundingBox,
  ParkingMapFeature,
  ParkingSegmentSummary,
} from '@/types/parking-domain';
import type {
  ParkingCameraState,
  ParkingClusterRequest,
  ParkingClusterResponse,
  ParkingCoordinates,
  ParkingMapSize,
} from '@/types/parking-map';
import type { ParkingZonePolygon } from '@/types/parking-zone';
import {
  deriveCameraViewportDeltas,
  getParkingClusterRequest,
  getParkingRenderCircleClusterRequest,
  zoomFromLongitudeDelta,
} from '@/utils/parking-map-geo';
import { parkingMapDataCache } from '@/utils/parking-map-data-cache';
import { parkingLayerReducer } from '@/utils/parking-layer-state';
import {
  cellSummaryToMapFeature,
  parkingMapFeatureToLegacyResponse,
  zoneSummaryToMapFeature,
} from '@/utils/parking-feature-adapters';
import { parkingSegmentToSummary } from '@/utils/parking-segments';
import { createParkingZoneMatcher } from '@/utils/parking-zones';

const CAMERA_DEBOUNCE_MS = 350;
const LAYER_TRANSITION_MS = 200;
const STATIC_ZONE_TTL_MS = 10 * 60 * 1000;
const CELL_TTL_MS = 60 * 1000;
const SEGMENT_TTL_MS = 30 * 1000;

type CameraMoveEvent = {
  coordinates: { latitude?: number; longitude?: number };
  zoom?: number;
  latitudeDelta?: number;
  longitudeDelta?: number;
};

type CachedStageData = {
  features: ParkingMapFeature[];
  segments: ParkingSegmentSummary[];
  bounds: ParkingBoundingBox | null;
  truncated: boolean;
};

export function useParkingMapData(
  initialCamera: ParkingCameraState,
  destination?: ParkingCoordinates,
  mapSize?: ParkingMapSize,
  isAutomaticFetchEnabled = true,
  parkingZonePolygons: ParkingZonePolygon[] = [],
) {
  const [currentRegion, setCurrentRegion] = useState(initialCamera);
  const [displayCamera, setDisplayCamera] = useState(initialCamera);
  const [loadedRequestKey, setLoadedRequestKey] = useState<string | null>(null);
  const [loadedRequestBounds, setLoadedRequestBounds] =
    useState<ParkingBoundingBox | null>(null);
  const [loadedRequestVersion, setLoadedRequestVersion] = useState(0);
  const [loadedSegments, setLoadedSegments] = useState<ParkingSegmentSummary[]>(
    [],
  );
  const semanticStage = useParkingSemanticZoomStage(currentRegion);
  const [layerState, dispatch] = useReducer(parkingLayerReducer, {
    activeStage: semanticStage,
    visibleStage: semanticStage,
    visibleFeatures: [],
    outgoingFeatures: [],
    status: 'loading',
    requestKey: null,
    error: null,
  });
  const latestCameraRef = useRef(initialCamera);
  const currentZoomRef = useRef(initialCamera.zoom);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const displayCameraFrameRef = useRef<number | null>(null);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeRequestKeyRef = useRef<string | null>(null);
  const parkingZoneMatcher = useMemo(
    () => createParkingZoneMatcher(parkingZonePolygons),
    [parkingZonePolygons],
  );

  const createRequest = useCallback(
    (camera: ParkingCameraState) =>
      (mapSize
        ? getParkingRenderCircleClusterRequest(camera, mapSize, destination)
        : null) ?? getParkingClusterRequest(camera, destination),
    [destination, mapSize],
  );

  const markLoaded = useCallback(
    (request: ParkingClusterRequest, data: CachedStageData) => {
      setLoadedRequestKey(request.tileKey);
      setLoadedRequestBounds(data.bounds);
      setLoadedSegments(data.segments);
      setLoadedRequestVersion((version) => version + 1);
    },
    [],
  );

  const fetchStageData = useCallback(
    async (
      stage: ParkingSemanticZoomStage,
      camera: ParkingCameraState,
      request: ParkingClusterRequest,
      signal: AbortSignal,
    ): Promise<CachedStageData> => {
      if (stage === 'city' || stage === 'zone') {
        const summaries = await fetchParkingZoneSummaries({ signal });
        return {
          features: summaries.map(zoneSummaryToMapFeature),
          segments: [],
          bounds: null,
          truncated: false,
        };
      }

      if (stage === 'cell') {
        const resolution = camera.zoom < 14 ? 'coarse' : 'fine';
        const cells = await fetchParkingCells({
          bounds: request.bbox,
          resolution,
          signal,
        });
        return {
          features: cells.map(cellSummaryToMapFeature),
          segments: [],
          bounds: request.bbox,
          truncated: cells.length >= 400,
        };
      }

      let segments: ParkingSegmentSummary[];
      let truncated: boolean;
      try {
        const response = await fetchParkingSegmentSummaries({
          bounds: request.bbox,
          signal,
        });
        segments = response.segments;
        truncated = response.truncated;
        if (__DEV__ && parkingZonePolygons.length > 0) {
          const sample = segments.slice(0, 100);
          let matchingAssignments = 0;
          let mismatchedAssignments = 0;
          for (const segment of sample) {
            const fallback = parkingZoneMatcher(
              segment.coordinates,
              segment.sourceAreaName,
            );
            if ((fallback?.zoneId ?? null) === segment.zoneId) {
              matchingAssignments += 1;
            } else {
              mismatchedAssignments += 1;
            }
          }
          console.debug('[parking-map] zone assignment audit', {
            matchingAssignments,
            mismatchedAssignments,
            sampleSize: sample.length,
            serverUnassigned: sample.filter(
              (segment) => segment.zoneId === null,
            ).length,
          });
        }
      } catch (error) {
        if (signal.aborted) {
          throw error;
        }
        // Temporary deployment fallback until the server migration is applied.
        // It is intentionally limited to detailed stages and logs assignment
        // diagnostics without restoring point-in-polygon work at broad zooms.
        const fallback = await fetchParkingSegments(request.bbox);
        segments = fallback.segments.map((segment) => {
          const summary = parkingSegmentToSummary(segment);
          if (summary.zoneId !== null) {
            return summary;
          }
          const match = parkingZoneMatcher(
            summary.coordinates,
            summary.sourceAreaName,
          );
          return { ...summary, zoneId: match?.zoneId ?? null };
        });
        truncated = fallback.truncated;
        if (__DEV__) {
          console.warn('[parking-map] using legacy segment assignment fallback', {
            assigned: segments.filter((segment) => segment.zoneId !== null)
              .length,
            reason: error instanceof Error ? error.message : String(error),
            segments: segments.length,
          });
        }
      }

      const features =
        stage === 'segment'
          ? segments.map((segment) => ({
              id: segment.id,
              kind: 'segment' as const,
              coordinates: segment.coordinates,
              stats: {
                segmentCount: 1,
                totalCapacity: segment.capacity,
                availableCapacity: segment.availability.availableSpaces,
                availabilityPercent: segment.availability.percent,
                pricing: {
                  minimumHourlyRate:
                    segment.pricing.status === 'paid'
                      ? segment.pricing.hourlyRate
                      : null,
                  maximumHourlyRate:
                    segment.pricing.status === 'paid'
                      ? segment.pricing.hourlyRate
                      : null,
                  hasFreeParking: segment.pricing.status === 'free',
                  hasUnknownPricing: segment.pricing.status === 'unknown',
                },
                availabilityStatus: segment.availability.status,
                updatedAt: segment.updatedAt,
              },
              parentId: segment.zoneId,
              segment,
            }))
          : clusterParkingSegmentFeatures({
              segments,
              bounds: request.bbox,
              zoom: camera.zoom,
            });

      return { features, segments, bounds: request.bbox, truncated };
    },
    [parkingZoneMatcher, parkingZonePolygons.length],
  );

  const loadForCamera = useCallback(
    async (
      camera: ParkingCameraState,
      requestedStage: ParkingSemanticZoomStage,
      preparedRequest?: ParkingClusterRequest,
    ) => {
      const request = preparedRequest ?? createRequest(camera);
      const resolution = requestedStage === 'cell' && camera.zoom >= 14
        ? 'fine'
        : 'coarse';
      const requestKey =
        requestedStage === 'city' || requestedStage === 'zone'
          ? `parking:${requestedStage}:zones:v1`
          : `parking:${requestedStage}:${resolution}:${request.tileKey}:v1`;
      const ttlMs =
        requestedStage === 'city' || requestedStage === 'zone'
          ? STATIC_ZONE_TTL_MS
          : requestedStage === 'cell'
            ? CELL_TTL_MS
            : SEGMENT_TTL_MS;
      const cached = parkingMapDataCache.get<CachedStageData>(requestKey);

      if (
        activeRequestKeyRef.current === requestKey &&
        abortControllerRef.current !== null &&
        !abortControllerRef.current.signal.aborted
      ) {
        return;
      }

      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
      activeRequestKeyRef.current = requestKey;
      dispatch({ type: 'request', stage: requestedStage, requestKey });
      if (cached) {
        dispatch({
          type: 'resolve',
          stage: requestedStage,
          requestKey,
          features: cached.value.features,
        });
        markLoaded(request, cached.value);
        if (cached.isFresh) {
          if (__DEV__) {
            console.debug('[parking-map] semantic data request', {
              cacheHit: true,
              featureCount: cached.value.features.length,
              stage: requestedStage,
              truncated: cached.value.truncated,
            });
          }
          return;
        }
        dispatch({ type: 'request', stage: requestedStage, requestKey });
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;
      const startedAt = Date.now();
      try {
        const data = await fetchStageData(
          requestedStage,
          camera,
          request,
          controller.signal,
        );
        if (
          controller.signal.aborted ||
          activeRequestKeyRef.current !== requestKey
        ) {
          return;
        }
        abortControllerRef.current = null;
        parkingMapDataCache.set(requestKey, data, ttlMs);
        dispatch({
          type: 'resolve',
          stage: requestedStage,
          requestKey,
          features: data.features,
        });
        markLoaded(request, data);
        if (__DEV__) {
          console.debug('[parking-map] semantic data request', {
            cacheHit: false,
            durationMs: Date.now() - startedAt,
            featureCount: data.features.length,
            stage: requestedStage,
            truncated: data.truncated,
          });
        }
      } catch (error) {
        if (
          controller.signal.aborted ||
          activeRequestKeyRef.current !== requestKey
        ) {
          return;
        }
        abortControllerRef.current = null;
        dispatch({
          type: 'reject',
          requestKey,
          error: error instanceof Error ? error.message : String(error),
        });
        if (__DEV__) {
          console.warn('[parking-map] semantic data request failed', {
            durationMs: Date.now() - startedAt,
            error: error instanceof Error ? error.message : String(error),
            stage: requestedStage,
          });
        }
      }
    },
    [createRequest, fetchStageData, markLoaded],
  );

  useEffect(() => {
    if (
      !isAutomaticFetchEnabled &&
      semanticStage !== 'city' &&
      semanticStage !== 'zone'
    ) {
      return;
    }
    void loadForCamera(currentRegion, semanticStage);
  }, [
    currentRegion,
    isAutomaticFetchEnabled,
    loadForCamera,
    semanticStage,
  ]);

  useEffect(() => {
    if (layerState.outgoingFeatures.length === 0) {
      return;
    }
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
    }
    transitionTimerRef.current = setTimeout(() => {
      dispatch({ type: 'clear-outgoing' });
      transitionTimerRef.current = null;
    }, LAYER_TRANSITION_MS);
  }, [layerState.outgoingFeatures]);

  useEffect(
    () => () => {
      abortControllerRef.current?.abort();
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (displayCameraFrameRef.current !== null) {
        cancelAnimationFrame(displayCameraFrameRef.current);
      }
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }
    },
    [],
  );

  const scheduleDisplayCameraUpdate = useCallback(
    (camera: ParkingCameraState) => {
      latestCameraRef.current = camera;
      if (displayCameraFrameRef.current !== null) {
        return;
      }
      displayCameraFrameRef.current = requestAnimationFrame(() => {
        displayCameraFrameRef.current = null;
        setDisplayCamera(latestCameraRef.current);
      });
    },
    [],
  );

  const onCameraMove = useCallback(
    (event: CameraMoveEvent, shouldFetch = true) => {
      const latitude = event.coordinates.latitude;
      const longitude = event.coordinates.longitude;
      if (latitude === undefined || longitude === undefined) {
        return;
      }
      const zoom =
        event.zoom ??
        (event.longitudeDelta
          ? zoomFromLongitudeDelta(event.longitudeDelta)
          : currentZoomRef.current);
      currentZoomRef.current = zoom;
      const viewportDeltas = mapSize
        ? deriveCameraViewportDeltas(
            {
              latitude,
              longitude,
              zoom,
              latitudeDelta: event.latitudeDelta,
              longitudeDelta: event.longitudeDelta,
            },
            mapSize,
            Platform.OS === 'ios' ? 'apple' : 'google',
          )
        : null;
      const camera: ParkingCameraState = {
        latitude,
        longitude,
        zoom,
        latitudeDelta: event.latitudeDelta ?? viewportDeltas?.latitudeDelta,
        longitudeDelta:
          event.longitudeDelta ?? viewportDeltas?.longitudeDelta,
      };
      scheduleDisplayCameraUpdate(camera);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        setDisplayCamera(latestCameraRef.current);
        setCurrentRegion(latestCameraRef.current);
        if (!shouldFetch) {
          return;
        }
      }, CAMERA_DEBOUNCE_MS);
    },
    [mapSize, scheduleDisplayCameraUpdate],
  );

  const requestParkingForCamera = useCallback(
    (camera: ParkingCameraState) => {
      latestCameraRef.current = camera;
      setCurrentRegion(camera);
      const request = createRequest(camera);
      const stage = deriveParkingSemanticZoomStage(camera);
      void loadForCamera(camera, stage, request);
      return request.tileKey;
    },
    [createRequest, loadForCamera],
  );

  const clearParkingData = useCallback(() => {
    activeRequestKeyRef.current = null;
    abortControllerRef.current?.abort();
    setLoadedRequestBounds(null);
    setLoadedRequestKey(null);
    setLoadedSegments([]);
  }, []);

  const visibleSpots = useMemo<ParkingClusterResponse[]>(
    () =>
      loadedSegments.flatMap((segment) => {
        const legacy = parkingMapFeatureToLegacyResponse({
          id: segment.id,
          kind: 'segment',
          coordinates: segment.coordinates,
          stats: {
            segmentCount: 1,
            totalCapacity: segment.capacity,
            availableCapacity: segment.availability.availableSpaces,
            availabilityPercent: segment.availability.percent,
            pricing: {
              minimumHourlyRate:
                segment.pricing.status === 'paid'
                  ? segment.pricing.hourlyRate
                  : null,
              maximumHourlyRate:
                segment.pricing.status === 'paid'
                  ? segment.pricing.hourlyRate
                  : null,
              hasFreeParking: segment.pricing.status === 'free',
              hasUnknownPricing: segment.pricing.status === 'unknown',
            },
            availabilityStatus: segment.availability.status,
            updatedAt: segment.updatedAt,
          },
          parentId: segment.zoneId,
          segment,
        });
        return legacy === null ? [] : [legacy];
      }),
    [loadedSegments],
  );

  return {
    clearParkingData,
    currentRegion,
    displayCamera,
    layerState,
    loadedRequestBounds,
    loadedRequestKey,
    loadedRequestVersion,
    onCameraMove,
    requestParkingForCamera,
    semanticStage,
    visibleSpots,
  };
}
