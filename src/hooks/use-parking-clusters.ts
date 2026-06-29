import { useCallback, useEffect, useRef, useState } from 'react';

import { getMockParkingClusters } from '@/services/parking-clusters';
import type {
  ParkingCameraState,
  ParkingClusterResponse,
  ParkingCoordinates,
} from '@/types/parking-map';
import {
  getParkingClusterRequest,
  zoomFromLongitudeDelta,
} from '@/utils/parking-map-geo';

const CAMERA_DEBOUNCE_MS = 350;
const MAX_CLIENT_CACHE_ENTRIES = 80;
const clusterCache = new Map<string, ParkingClusterResponse[]>();

function cacheClusters(key: string, clusters: ParkingClusterResponse[]) {
  clusterCache.delete(key);
  clusterCache.set(key, clusters);

  if (clusterCache.size > MAX_CLIENT_CACHE_ENTRIES) {
    const oldestKey = clusterCache.keys().next().value;
    if (oldestKey) {
      clusterCache.delete(oldestKey);
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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const displayCameraFrameRef = useRef<number | null>(null);
  const latestCameraRef = useRef<ParkingCameraState>(initialCamera);
  const currentZoomRef = useRef(initialCamera.zoom);
  const requestKeyRef = useRef<string | null>(null);

  const loadClusters = useCallback((camera: ParkingCameraState) => {
    const request = getParkingClusterRequest(camera, destination);
    setCurrentRegion(camera);
    setCurrentZoom(request.zoom);
    currentZoomRef.current = request.zoom;

    if (request.tileKey === requestKeyRef.current) {
      return;
    }

    requestKeyRef.current = request.tileKey;

    const cached = clusterCache.get(request.tileKey);
    if (cached) {
      setVisibleClusters(cached);
      return;
    }

    const clusters = getMockParkingClusters(request);
    cacheClusters(request.tileKey, clusters);
    setVisibleClusters(clusters);
  }, [destination]);

  useEffect(() => {
    loadClusters(initialCamera);

    return () => {
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
          loadClusters(latestCameraRef.current);
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
  };
}
