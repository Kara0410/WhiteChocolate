import { useEffect, useMemo } from 'react';

import type { ParkingSemanticZoomStage } from '@/components/parking-map/map-detail-level';
import { CELL_SUMMARY_MARKER_SIZE } from '@/components/parking-map/cell-summary-marker';
import {
  filterParkingMarkersForScreenCircle,
  getDisplayedParkingMarkerItems,
  projectMapCoordinate,
  projectSelectedParkingMarkers,
  selectSpatiallySeparatedMarkers,
} from '@/components/parking-map/marker-density';
import { ZONE_SUMMARY_MARKER_SIZE } from '@/components/parking-map/zone-summary-marker';
import type { PlaceSearchResult } from '@/hooks/use-google-place-search';
import type {
  ParkingCellSummary,
  ParkingMapFeature,
  ParkingZoneSummary,
} from '@/types/parking-domain';
import type {
  ParkingBoundingBox,
  ParkingCameraState,
  ParkingClusterResponse,
  ParkingCoordinates,
  ParkingMapSize,
} from '@/types/parking-map';
import { parkingMapFeatureToLegacyResponse } from '@/utils/parking-feature-adapters';
import { hasValidParkingCoordinates } from '@/utils/parking-map-geo';

const EMPTY_ZONE_SUMMARIES: ParkingZoneSummary[] = [];
const EMPTY_CELL_SUMMARIES: ParkingCellSummary[] = [];

type UseParkingMarkerPipelineOptions = {
  activeOverlay: string;
  currentRegion: ParkingCameraState;
  semanticStage: ParkingSemanticZoomStage;
  displayCamera: ParkingCameraState;
  highlightedSearchSpots: ParkingClusterResponse[];
  isAutomaticParkingFetchEnabled: boolean;
  isMapMoving: boolean;
  loadedRequestBounds: ParkingBoundingBox | null;
  mapMode: string;
  mapSize: ParkingMapSize;
  layerFeatures: ParkingMapFeature[];
  selectedParkingItem: ParkingClusterResponse | null;
  selectedSearchPlace: PlaceSearchResult | null;
  userLocation?: ParkingCoordinates | null;
};

export function useParkingMarkerPipeline({
  activeOverlay,
  currentRegion,
  semanticStage,
  displayCamera,
  highlightedSearchSpots,
  isAutomaticParkingFetchEnabled,
  isMapMoving,
  loadedRequestBounds,
  mapMode,
  mapSize,
  layerFeatures,
  selectedParkingItem,
  selectedSearchPlace,
  userLocation,
}: UseParkingMarkerPipelineOptions) {
  const markerItems = useMemo(
    () =>
      layerFeatures.flatMap((feature) => {
        const item = parkingMapFeatureToLegacyResponse(feature);
        return item === null ? [] : [item];
      }),
    [layerFeatures],
  );
  const circleFilterResult = useMemo(
    () =>
      filterParkingMarkersForScreenCircle(markerItems, {
        camera: currentRegion,
        width: mapSize.width,
        height: mapSize.height,
      }),
    [currentRegion, mapSize.height, mapSize.width, markerItems],
  );
  const circularFilteredClusters = circleFilterResult.markers;

  useEffect(() => {
    if (!__DEV__ || !isAutomaticParkingFetchEnabled) {
      return;
    }

    const debugDetails = {
      afterCircularFilter: circularFilteredClusters.length,
      bbox: loadedRequestBounds,
      cameraCenter: {
        latitude: currentRegion.latitude,
        longitude: currentRegion.longitude,
      },
      mapSize,
      radiusMeters: circleFilterResult.radiusMeters,
      radiusPixels: circleFilterResult.radiusPixels,
      sampleMarkerCoordinates: markerItems.slice(0, 3).map((marker) => ({
        latitude: marker.latitude,
        longitude: marker.longitude,
      })),
      serverMarkers: markerItems.length,
    };

    console.debug('[parking-map] Parking circle filter', debugDetails);

    if (circleFilterResult.removedAllMarkers) {
      console.warn(
        'Parking circle filter rejected all server-returned markers; using bbox results.',
        debugDetails,
      );
    } else if (circleFilterResult.usedServerFallback) {
      console.warn(
        'Parking circle filter used the server-filtered marker fallback.',
        debugDetails,
      );
    }
  }, [
    circleFilterResult.radiusMeters,
    circleFilterResult.radiusPixels,
    circleFilterResult.removedAllMarkers,
    circleFilterResult.usedServerFallback,
    circularFilteredClusters.length,
    currentRegion,
    isAutomaticParkingFetchEnabled,
    loadedRequestBounds,
    mapSize,
    markerItems,
    markerItems.length,
  ]);

  const densityFilteredMarkers = useMemo(
    () =>
      mapSize.width > 0 && mapSize.height > 0
        ? selectSpatiallySeparatedMarkers(circularFilteredClusters, {
            camera: currentRegion,
            width: mapSize.width,
            height: mapSize.height,
          })
        : [],
    [
      currentRegion,
      circularFilteredClusters,
      mapSize.height,
      mapSize.width,
    ],
  );

  const displayedMarkerItems = useMemo(() => {
    if (mapMode === 'munichOverview') {
      return [];
    }

    return getDisplayedParkingMarkerItems(
      semanticStage === 'segment' || semanticStage === 'segmentCluster'
        ? densityFilteredMarkers
        : [],
      selectedParkingItem,
      selectedSearchPlace !== null ? highlightedSearchSpots : null,
      activeOverlay !== 'none',
    );
  }, [
    activeOverlay,
    densityFilteredMarkers,
    semanticStage,
    highlightedSearchSpots,
    mapMode,
    selectedParkingItem,
    selectedSearchPlace,
  ]);

  const projectedMarkers = useMemo(
    () =>
      mapSize.width > 0 && mapSize.height > 0
        ? projectSelectedParkingMarkers(displayedMarkerItems, {
            camera: displayCamera,
            width: mapSize.width,
            height: mapSize.height,
          })
        : [],
    [
      displayCamera,
      displayedMarkerItems,
      mapSize.height,
      mapSize.width,
    ],
  );

  const zoneSummaries = useMemo(
    () =>
      semanticStage === 'zone' && mapMode !== 'munichOverview'
        ? layerFeatures.flatMap((feature) =>
            feature.kind === 'zone'
              ? [
                  {
                    kind: 'zone-summary' as const,
                    zoneId: feature.zoneId,
                    zoneName: feature.zoneName,
                    representativePoint: feature.coordinates,
                    stats: feature.stats,
                  },
                ]
              : [],
          )
        : EMPTY_ZONE_SUMMARIES,
    [layerFeatures, mapMode, semanticStage],
  );

  const cellSummaries = useMemo(
    () =>
      semanticStage === 'cell' && mapMode !== 'munichOverview'
        ? layerFeatures.flatMap((feature) =>
            feature.kind === 'cell' ? [feature.cell] : [],
          )
        : EMPTY_CELL_SUMMARIES,
    [layerFeatures, mapMode, semanticStage],
  );

  const projectedZoneSummaries = useMemo(() => {
    if (
      zoneSummaries.length === 0 ||
      mapSize.width <= 0 ||
      mapSize.height <= 0 ||
      activeOverlay !== 'none' ||
      selectedSearchPlace !== null ||
      selectedParkingItem !== null
    ) {
      return [];
    }

    const margin = ZONE_SUMMARY_MARKER_SIZE.width;
    return zoneSummaries.flatMap((summary) => {
      const position = projectMapCoordinate(summary.representativePoint, {
        camera: displayCamera,
        height: mapSize.height,
        width: mapSize.width,
      });

      if (
        !Number.isFinite(position.x) ||
        !Number.isFinite(position.y) ||
        position.x < -margin ||
        position.x > mapSize.width + margin ||
        position.y < -margin ||
        position.y > mapSize.height + margin
      ) {
        return [];
      }

      return [{ summary, x: position.x, y: position.y }];
    });
  }, [
    activeOverlay,
    displayCamera,
    mapSize.height,
    mapSize.width,
    selectedParkingItem,
    selectedSearchPlace,
    zoneSummaries,
  ]);

  const projectedCellSummaries = useMemo(() => {
    if (
      cellSummaries.length === 0 ||
      mapSize.width <= 0 ||
      mapSize.height <= 0 ||
      activeOverlay !== 'none' ||
      selectedParkingItem !== null
    ) {
      return [];
    }
    const margin = CELL_SUMMARY_MARKER_SIZE.width;
    return cellSummaries.flatMap((summary) => {
      const position = projectMapCoordinate(summary.center, {
        camera: displayCamera,
        height: mapSize.height,
        width: mapSize.width,
      });
      return !Number.isFinite(position.x) ||
        !Number.isFinite(position.y) ||
        position.x < -margin ||
        position.x > mapSize.width + margin ||
        position.y < -margin ||
        position.y > mapSize.height + margin
        ? []
        : [{ summary, x: position.x, y: position.y }];
    });
  }, [
    activeOverlay,
    cellSummaries,
    displayCamera,
    mapSize.height,
    mapSize.width,
    selectedParkingItem,
  ]);

  useEffect(() => {
    if (
      !__DEV__ ||
      isMapMoving ||
      (semanticStage !== 'segment' &&
        semanticStage !== 'segmentCluster') ||
      activeOverlay !== 'none' ||
      selectedSearchPlace !== null ||
      mapSize.width <= 0 ||
      mapSize.height <= 0 ||
      markerItems.length === 0 ||
      circleFilterResult.removedAllMarkers ||
      projectedMarkers.length > 0
    ) {
      return;
    }

    console.warn('Parking marker pipeline produced no projected markers.', {
      currentRegion,
      circularFilteredMarkers: circularFilteredClusters.length,
      densityFilteredMarkers: densityFilteredMarkers.length,
      displayCamera,
      mapSize: {
        height: mapSize.height,
        width: mapSize.width,
      },
      projectedMarkers: projectedMarkers.length,
      radiusPixels: circleFilterResult.radiusPixels,
      visibleClusters: markerItems.length,
    });
  }, [
    activeOverlay,
    circleFilterResult.radiusPixels,
    circleFilterResult.removedAllMarkers,
    circularFilteredClusters.length,
    currentRegion,
    densityFilteredMarkers.length,
    semanticStage,
    displayCamera,
    isMapMoving,
    mapSize.height,
    mapSize.width,
    projectedMarkers.length,
    selectedSearchPlace,
    markerItems.length,
  ]);

  const projectedSearchDestination = useMemo(() => {
    if (
      selectedSearchPlace === null ||
      !hasValidParkingCoordinates(selectedSearchPlace) ||
      mapSize.width <= 0 ||
      mapSize.height <= 0
    ) {
      return null;
    }

    const position = projectMapCoordinate(selectedSearchPlace, {
      camera: displayCamera,
      height: mapSize.height,
      width: mapSize.width,
    });

    if (
      position.x < -40 ||
      position.x > mapSize.width + 40 ||
      position.y < -44 ||
      position.y > mapSize.height + 44
    ) {
      return null;
    }

    return position;
  }, [
    displayCamera,
    mapSize.height,
    mapSize.width,
    selectedSearchPlace,
  ]);

  const projectedUserLocation = useMemo(() => {
    if (
      mapMode === 'munichOverview' ||
      userLocation == null ||
      !hasValidParkingCoordinates(userLocation) ||
      mapSize.width <= 0 ||
      mapSize.height <= 0
    ) {
      return null;
    }

    const position = projectMapCoordinate(userLocation, {
      camera: displayCamera,
      height: mapSize.height,
      width: mapSize.width,
    });

    if (
      position.x < -28 ||
      position.x > mapSize.width + 28 ||
      position.y < -28 ||
      position.y > mapSize.height + 28
    ) {
      return null;
    }

    return position;
  }, [displayCamera, mapMode, mapSize.height, mapSize.width, userLocation]);

  return {
    circleFilterResult,
    circularFilteredClusters,
    densityFilteredMarkers,
    displayedMarkerItems,
    projectedMarkers,
    projectedCellSummaries,
    projectedSearchDestination,
    projectedUserLocation,
    projectedZoneSummaries,
    cellSummaries,
    zoneSummaries,
  };
}
