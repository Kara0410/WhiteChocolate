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
  buildParkingEstimatorRequest,
  mergeParkingAvailabilityEstimates,
  ParkingEstimatorServiceError,
  requestParkingAvailabilityEstimates,
} from '@/services/parkingAvailabilityEstimator';
import {
  fetchParkingCells,
  fetchParkingSegmentSummaries,
} from '@/services/parkingMapData';
import type {
  ParkingBoundingBox,
  ParkingEstimateDestination,
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
  parkingMapFeatureToResponse,
} from '@/utils/parking-feature-adapters';
import { logAppError, normalizeAppError } from '@/utils/app-errors';
import { LatestParkingEstimatorRequest } from '@/utils/parking-estimator-request';

const CAMERA_DEBOUNCE_MS = 350;
const LAYER_TRANSITION_MS = 200;
const CITY_CELL_TTL_MS = 2 * 60 * 1000;
const CELL_TTL_MS = 60 * 1000;
const SEGMENT_TTL_MS = 30 * 1000;
const TRAFFIC_ESTIMATES_ENABLED =
  process.env.EXPO_PUBLIC_PARKING_TRAFFIC_ESTIMATES === 'true';
const REQUESTED_AT_REUSE_MS = 30_000;

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
  contextHash: string | null;
  truncated: boolean;
};

type ActiveParkingEstimate = {
  destinationKey: string;
  response: Awaited<ReturnType<typeof requestParkingAvailabilityEstimates>>;
};

export function useParkingMapData(
  initialCamera: ParkingCameraState,
  destination?: ParkingEstimateDestination,
  origin?: ParkingCoordinates | null,
  mapSize?: ParkingMapSize,
  isAutomaticFetchEnabled = true,
) {
  const [currentRegion, setCurrentRegion] = useState(initialCamera);
  const [displayCamera, setDisplayCamera] = useState(initialCamera);
  const [loadedRequestKey, setLoadedRequestKey] = useState<string | null>(null);
  const [loadedRequestBounds, setLoadedRequestBounds] =
    useState<ParkingBoundingBox | null>(null);
  const [loadedContextHash, setLoadedContextHash] = useState<string | null>(
    null,
  );
  const [loadedRequestVersion, setLoadedRequestVersion] = useState(0);
  const [loadedSegments, setLoadedSegments] = useState<ParkingSegmentSummary[]>(
    [],
  );
  const [activeEstimate, setActiveEstimate] =
    useState<ActiveParkingEstimate | null>(null);
  const [availabilityStatus, setAvailabilityStatus] =
    useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [availabilityMessage, setAvailabilityMessage] =
    useState<string | null>(null);
  const [estimationRefreshVersion, setEstimationRefreshVersion] = useState(0);
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
  const estimatorAbortControllerRef = useRef<AbortController | null>(null);
  const latestEstimatorRequestRef = useRef(new LatestParkingEstimatorRequest());
  const requestedAtByContextRef = useRef(
    new Map<string, { expiresAt: number; requestedAt: Date }>(),
  );
  const activeRequestKeyRef = useRef<string | null>(null);
  const destinationKey = useMemo(
    () =>
      destination
        ? JSON.stringify({
            latitude: destination.latitude,
            longitude: destination.longitude,
            placeId: destination.placeId?.trim() || null,
          })
        : null,
    [destination],
  );
  const estimateResponse =
    activeEstimate?.destinationKey === destinationKey
      ? activeEstimate.response
      : null;

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
      setLoadedContextHash(data.contextHash);
      setLoadedSegments(data.segments);
      setLoadedRequestVersion((version) => version + 1);
    },
    [],
  );

  useEffect(() => {
    const requestId = latestEstimatorRequestRef.current.begin();
    estimatorAbortControllerRef.current?.abort();
    estimatorAbortControllerRef.current = null;

    if (!destination || destinationKey === null) {
      setActiveEstimate(null);
      setAvailabilityStatus('idle');
      setAvailabilityMessage(null);
      return;
    }

    const controller = new AbortController();
    estimatorAbortControllerRef.current = controller;
    const parkingRequest = createRequest(latestCameraRef.current);
    const trafficEnabled = TRAFFIC_ESTIMATES_ENABLED && origin !== null;
    const requestedAtKey = JSON.stringify({
      bounds: parkingRequest.bbox,
      destination: destinationKey,
      origin: origin
        ? [origin.latitude.toFixed(4), origin.longitude.toFixed(4)]
        : null,
      trafficEnabled,
    });
    const now = Date.now();
    const previousRequestedAt = requestedAtByContextRef.current.get(requestedAtKey);
    const requestedAt =
      previousRequestedAt && previousRequestedAt.expiresAt > now
        ? previousRequestedAt.requestedAt
        : new Date(now);
    requestedAtByContextRef.current.set(requestedAtKey, {
      expiresAt: now + REQUESTED_AT_REUSE_MS,
      requestedAt,
    });
    if (requestedAtByContextRef.current.size > 16) {
      requestedAtByContextRef.current.delete(
        requestedAtByContextRef.current.keys().next().value!,
      );
    }

    setAvailabilityStatus('loading');
    setAvailabilityMessage(null);

    let estimatorRequest;
    try {
      estimatorRequest = buildParkingEstimatorRequest({
        bounds: parkingRequest.bbox,
        destination,
        origin,
        includeTraffic: trafficEnabled,
        requestedAt,
      });
    } catch (error) {
      if (latestEstimatorRequestRef.current.isCurrent(requestId)) {
        setAvailabilityStatus('error');
        setAvailabilityMessage(
          error instanceof ParkingEstimatorServiceError
            ? error.userMessage
            : 'Move closer to the destination and try again.',
        );
      }
      return;
    }

    void requestParkingAvailabilityEstimates(estimatorRequest, {
      signal: controller.signal,
    })
      .then((response) => {
        if (
          controller.signal.aborted ||
          !latestEstimatorRequestRef.current.isCurrent(requestId)
        ) {
          return;
        }
        setActiveEstimate({ destinationKey, response });
        setAvailabilityStatus('ready');
        setAvailabilityMessage(
          trafficEnabled && response.providerStatus.routes !== 'ok'
            ? 'Traffic information is unavailable, but parking estimates can still be shown.'
            : null,
        );
      })
      .catch((error) => {
        if (
          controller.signal.aborted ||
          !latestEstimatorRequestRef.current.isCurrent(requestId)
        ) {
          return;
        }
        setAvailabilityStatus('error');
        setAvailabilityMessage(
          error instanceof ParkingEstimatorServiceError
            ? error.userMessage
            : 'Parking availability could not be updated right now.',
        );
        logAppError('parking-data', error, { source: 'estimator' });
      });

    return () => {
      controller.abort();
    };
  }, [
    createRequest,
    destination,
    destinationKey,
    estimationRefreshVersion,
    origin,
  ]);

  const fetchStageData = useCallback(
    async (
      stage: ParkingSemanticZoomStage,
      camera: ParkingCameraState,
      request: ParkingClusterRequest,
      signal: AbortSignal,
    ): Promise<CachedStageData> => {
      if (stage === 'city' || stage === 'cell') {
        const resolution = stage === 'city' || camera.zoom < 14
          ? 'coarse'
          : 'fine';
        const cells = await fetchParkingCells({
          bounds: request.bbox,
          contextHash: estimateResponse?.contextHash ?? null,
          resolution,
          signal,
        });
        return {
          features: cells.map(cellSummaryToMapFeature),
          segments: [],
          bounds: request.bbox,
          contextHash: estimateResponse?.contextHash ?? null,
          truncated: cells.length >= 400,
        };
      }

      let segments: ParkingSegmentSummary[];
      let truncated: boolean;
      const response = await fetchParkingSegmentSummaries({
        bounds: request.bbox,
        signal,
      });
      segments = response.segments;
      truncated = response.truncated;

      if (estimateResponse) {
        segments = mergeParkingAvailabilityEstimates(
          segments,
          estimateResponse.estimates,
          { unknownWhenMissing: true },
        );
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
              segment,
            }))
          : clusterParkingSegmentFeatures({
              segments,
              bounds: request.bbox,
              zoom: camera.zoom,
            });

      return {
        features,
        segments,
        bounds: request.bbox,
        contextHash: estimateResponse?.contextHash ?? null,
        truncated,
      };
    },
    [estimateResponse],
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
      const requestKey = `parking:${requestedStage}:${resolution}:${request.tileKey}:ctx:${estimateResponse?.contextHash ?? 'none'}:v2`;
      const ttlMs =
        requestedStage === 'city'
          ? CITY_CELL_TTL_MS
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
        const normalized = normalizeAppError(error, 'parking-data');
        dispatch({
          type: 'reject',
          requestKey,
          error: normalized.message,
        });
        logAppError('parking-data', error, {
          durationMs: Date.now() - startedAt,
          stage: requestedStage,
        });
      }
    },
    [createRequest, estimateResponse?.contextHash, fetchStageData, markLoaded],
  );

  const retryLatest = useCallback(() => {
    const camera = latestCameraRef.current;
    void loadForCamera(camera, deriveParkingSemanticZoomStage(camera));
  }, [loadForCamera]);

  useEffect(() => {
    if (
      !isAutomaticFetchEnabled &&
      semanticStage !== 'city'
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
      estimatorAbortControllerRef.current?.abort();
      latestEstimatorRequestRef.current.invalidate();
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

  const refreshParkingAvailabilityForCamera = useCallback(
    (camera: ParkingCameraState) => {
      const key = requestParkingForCamera(camera);
      setEstimationRefreshVersion((version) => version + 1);
      return key;
    },
    [requestParkingForCamera],
  );

  const clearParkingData = useCallback(() => {
    activeRequestKeyRef.current = null;
    abortControllerRef.current?.abort();
    setLoadedRequestBounds(null);
    setLoadedContextHash(null);
    setLoadedRequestKey(null);
    setLoadedSegments([]);
  }, []);

  const visibleSpots = useMemo<ParkingClusterResponse[]>(
    () =>
      loadedSegments.flatMap((segment) => {
        const response = parkingMapFeatureToResponse({
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
          segment,
        });
        return response === null ? [] : [response];
      }),
    [loadedSegments],
  );

  return {
    activeContextHash: estimateResponse?.contextHash ?? null,
    availabilityMessage,
    availabilityStatus,
    clearParkingData,
    currentRegion,
    displayCamera,
    layerState,
    loadedRequestBounds,
    loadedContextHash,
    loadedRequestKey,
    loadedRequestVersion,
    onCameraMove,
    requestParkingForCamera,
    refreshParkingAvailabilityForCamera,
    retryLatest,
    semanticStage,
    visibleSpots,
  };
}
