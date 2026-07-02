import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import {
  createParkingClusterEngine,
  parkingRecordToResponse,
} from '@/services/parking-clustering';
import { fetchParkingSegments } from '@/services/parkingSegments';
import type {
  ParkingBoundingBox,
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
import { parkingSegmentToMapRecord } from '@/utils/parking-segments';

const CAMERA_DEBOUNCE_MS = 350;
const MAX_CLIENT_CACHE_ENTRIES = 80;
type CachedParkingData = {
  clusters: ParkingClusterResponse[];
  spots: ParkingClusterResponse[];
};
const parkingCache = new Map<string, CachedParkingData>();

function cacheParkingData(key: string, data: CachedParkingData) {
  parkingCache.delete(key);
  parkingCache.set(key, data);

  if (parkingCache.size > MAX_CLIENT_CACHE_ENTRIES) {
    const oldestKey = parkingCache.keys().next().value;
    if (oldestKey) {
      parkingCache.delete(oldestKey);
    }
  }
}

type CameraMoveEvent = {
  coordinates: {
    latitude?: number;
    longitude?: number;
  };
  zoom?: number;
  latitudeDelta?: number;
  longitudeDelta?: number;
};

export function useParkingClusters(
  initialCamera: ParkingCameraState,
  destination?: ParkingCoordinates,
  mapSize?: ParkingMapSize,
  isAutomaticFetchEnabled = true,
) {
  const [currentRegion, setCurrentRegion] = useState(initialCamera);
  const [displayCamera, setDisplayCamera] = useState(initialCamera);
  const [visibleClusters, setVisibleClusters] = useState<
    ParkingClusterResponse[]
  >([]);
  const [visibleSpots, setVisibleSpots] = useState<ParkingClusterResponse[]>([]);
  const [loadedRequestKey, setLoadedRequestKey] = useState<string | null>(null);
  const [loadedRequestBounds, setLoadedRequestBounds] =
    useState<ParkingBoundingBox | null>(null);
  const [loadedRequestVersion, setLoadedRequestVersion] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const displayCameraFrameRef = useRef<number | null>(null);
  const latestCameraRef = useRef<ParkingCameraState>(initialCamera);
  const currentZoomRef = useRef(initialCamera.zoom);
  const requestKeyRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);
  const markRequestLoaded = useCallback((request: ParkingClusterRequest) => {
    setLoadedRequestKey(request.tileKey);
    setLoadedRequestBounds(request.bbox);
    setLoadedRequestVersion((current) => current + 1);
  }, []);

  const createRequest = useCallback(
    (camera: ParkingCameraState) =>
      (mapSize
        ? getParkingRenderCircleClusterRequest(
            camera,
            mapSize,
            destination,
          )
        : null) ?? getParkingClusterRequest(camera, destination),
    [destination, mapSize],
  );

  const loadClusters = useCallback(async (
    camera: ParkingCameraState,
    preparedRequest?: ParkingClusterRequest,
  ) => {
    const request = preparedRequest ?? createRequest(camera);
    setCurrentRegion(camera);
    currentZoomRef.current = request.zoom;

    if (request.tileKey === requestKeyRef.current) {
      return;
    }

    requestKeyRef.current = request.tileKey;

    const cached = parkingCache.get(request.tileKey);
    if (cached) {
      setVisibleClusters(cached.clusters);
      setVisibleSpots(cached.spots);
      markRequestLoaded(request);
      return;
    }

    try {
      const { segments, truncated } = await fetchParkingSegments(request.bbox);
      const records = segments.map(parkingSegmentToMapRecord);
      const spots = records.map((record) =>
        parkingRecordToResponse(record, request.destination),
      );
      const clusters = createParkingClusterEngine(records).getClusters(
        request.bbox,
        request.zoom,
        request.destination,
      );

      if (__DEV__) {
        console.debug('[parking-map] Parking bbox fetch', {
          bbox: request.bbox,
          cameraCenter: {
            latitude: camera.latitude,
            longitude: camera.longitude,
          },
          sampleMarkerCoordinates: clusters.slice(0, 3).map((marker) => ({
            latitude: marker.latitude,
            longitude: marker.longitude,
          })),
          serverMarkers: clusters.length,
          serverSegments: segments.length,
        });
      }

      if (
        !isMountedRef.current ||
        requestKeyRef.current !== request.tileKey
      ) {
        return;
      }

      if (__DEV__ && segments.length > 0 && clusters.length === 0) {
        console.warn('Camera parking query produced no clusters.', {
          camera,
          clusters: clusters.length,
          fetchedSegments: segments.length,
          requestBbox: request.bbox,
        });
      }

      if (
        __DEV__ &&
        request.tileKey.startsWith('parking:circle:') &&
        segments.length === 0
      ) {
        console.warn('No parking data returned for camera circle bbox.', {
          camera,
          fetchBbox: request.bbox,
          mapSize,
        });
      }

      if (truncated && __DEV__) {
        console.warn(
          'Supabase parking segment result reached the per-viewport limit.',
        );
      }

      cacheParkingData(request.tileKey, { clusters, spots });
      setVisibleClusters(clusters);
      setVisibleSpots(spots);
      markRequestLoaded(request);
    } catch (error) {
      if (
        !isMountedRef.current ||
        requestKeyRef.current !== request.tileKey
      ) {
        return;
      }

      if (__DEV__) {
        console.warn(
          'Supabase parking fetch failed.',
          error,
        );
      }

      setVisibleClusters([]);
      setVisibleSpots([]);
      markRequestLoaded(request);
    }
  }, [createRequest, mapSize, markRequestLoaded]);

  const requestParkingForCamera = useCallback(
    (camera: ParkingCameraState) => {
      const request = createRequest(camera);
      void loadClusters(camera, request);
      return request.tileKey;
    },
    [createRequest, loadClusters],
  );

  const clearParkingData = useCallback(() => {
    requestKeyRef.current = null;
    setLoadedRequestBounds(null);
    setLoadedRequestKey(null);
    setVisibleClusters([]);
    setVisibleSpots([]);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    if (isAutomaticFetchEnabled) {
      void loadClusters(latestCameraRef.current);
    }

    return () => {
      isMountedRef.current = false;
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      if (displayCameraFrameRef.current !== null) {
        cancelAnimationFrame(displayCameraFrameRef.current);
        displayCameraFrameRef.current = null;
      }
    };
  }, [isAutomaticFetchEnabled, loadClusters]);

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
    (event: CameraMoveEvent) => {
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
        latitudeDelta:
          event.latitudeDelta ?? viewportDeltas?.latitudeDelta,
        longitudeDelta:
          event.longitudeDelta ?? viewportDeltas?.longitudeDelta,
      };
      scheduleDisplayCameraUpdate(camera);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(
        () => {
          debounceRef.current = null;

          if (displayCameraFrameRef.current !== null) {
            cancelAnimationFrame(displayCameraFrameRef.current);
            displayCameraFrameRef.current = null;
          }

          setDisplayCamera(latestCameraRef.current);
          if (isAutomaticFetchEnabled) {
            void loadClusters(latestCameraRef.current);
          }
        },
        CAMERA_DEBOUNCE_MS,
      );
    },
    [
      isAutomaticFetchEnabled,
      loadClusters,
      mapSize,
      scheduleDisplayCameraUpdate,
    ],
  );

  return {
    clearParkingData,
    currentRegion,
    displayCamera,
    loadedRequestBounds,
    loadedRequestKey,
    loadedRequestVersion,
    onCameraMove,
    requestParkingForCamera,
    visibleClusters,
    visibleSpots,
  };
}
