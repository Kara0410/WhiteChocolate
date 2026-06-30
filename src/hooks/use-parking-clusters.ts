import { useCallback, useEffect, useRef, useState } from 'react';

import {
  createParkingClusterEngine,
  parkingRecordToResponse,
} from '@/services/parking-clustering';
import { fetchParkingSegments } from '@/services/parkingSegments';
import type {
  ParkingCameraState,
  ParkingClusterResponse,
  ParkingCoordinates,
} from '@/types/parking-map';
import {
  getParkingClusterRequest,
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
) {
  const [currentRegion, setCurrentRegion] = useState(initialCamera);
  const [displayCamera, setDisplayCamera] = useState(initialCamera);
  const [currentZoom, setCurrentZoom] = useState(initialCamera.zoom);
  const [visibleClusters, setVisibleClusters] = useState<
    ParkingClusterResponse[]
  >([]);
  const [visibleSpots, setVisibleSpots] = useState<ParkingClusterResponse[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const displayCameraFrameRef = useRef<number | null>(null);
  const latestCameraRef = useRef<ParkingCameraState>(initialCamera);
  const currentZoomRef = useRef(initialCamera.zoom);
  const requestKeyRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);

  const loadClusters = useCallback(async (camera: ParkingCameraState) => {
    const request = getParkingClusterRequest(camera, destination);
    setCurrentRegion(camera);
    setCurrentZoom(request.zoom);
    currentZoomRef.current = request.zoom;

    if (request.tileKey === requestKeyRef.current) {
      return;
    }

    requestKeyRef.current = request.tileKey;

    const cached = parkingCache.get(request.tileKey);
    if (cached) {
      setVisibleClusters(cached.clusters);
      setVisibleSpots(cached.spots);
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

      if (
        !isMountedRef.current ||
        requestKeyRef.current !== request.tileKey
      ) {
        return;
      }

      if (truncated && __DEV__) {
        console.warn(
          'Supabase parking segment result reached the per-viewport limit.',
        );
      }

      cacheParkingData(request.tileKey, { clusters, spots });
      setVisibleClusters(clusters);
      setVisibleSpots(spots);
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
    }
  }, [destination]);

  useEffect(() => {
    isMountedRef.current = true;
    void loadClusters(initialCamera);

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
  }, [initialCamera, loadClusters]);

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
      const camera: ParkingCameraState = {
        latitude,
        longitude,
        zoom,
        latitudeDelta: event.latitudeDelta,
        longitudeDelta: event.longitudeDelta,
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
          void loadClusters(latestCameraRef.current);
        },
        CAMERA_DEBOUNCE_MS,
      );
    },
    [loadClusters, scheduleDisplayCameraUpdate],
  );

  return {
    currentRegion,
    displayCamera,
    currentZoom,
    onCameraMove,
    visibleClusters,
    visibleSpots,
  };
}
