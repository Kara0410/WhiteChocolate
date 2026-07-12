import { memo } from 'react';
import { View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  ReduceMotion,
  ZoomIn,
} from 'react-native-reanimated';

import {
  MAP_ELEVATIONS,
  MAP_LAYERS,
} from '@/components/parking-map/map-layers';
import type { MapDetailLevel } from '@/components/parking-map/map-detail-level';
import type { ProjectedParkingMarker } from '@/components/parking-map/marker-density';
import { ParkingMarkerCard } from '@/components/parking-map/parking-marker-card';
import {
  ZONE_SUMMARY_MARKER_SIZE,
  ZoneSummaryMarker,
} from '@/components/parking-map/zone-summary-marker';
import type { ParkingClusterResponse } from '@/types/parking-map';
import type { ParkingZoneSummary } from '@/utils/parking-zones';

type ProjectedZoneSummary = {
  summary: ParkingZoneSummary;
  x: number;
  y: number;
};

type ParkingMarkerOverlayProps = {
  detailLevel: MapDetailLevel;
  isMapMoving: boolean;
  isSearchRecommendationMode: boolean;
  onMarkerPress: (item: ParkingClusterResponse) => void;
  onZoneSummaryPress: (summary: ParkingZoneSummary) => void;
  projectedMarkers: ProjectedParkingMarker[];
  projectedZoneSummaries: ProjectedZoneSummary[];
  selectedParkingItemId?: string;
};

const DETAIL_LAYER_ENTERING = FadeIn.duration(180).reduceMotion(
  ReduceMotion.System,
);
const DETAIL_LAYER_EXITING = FadeOut.duration(140).reduceMotion(
  ReduceMotion.System,
);
const SEARCH_MARKER_ENTERING = ZoomIn.duration(180)
  .withInitialValues({ opacity: 0, transform: [{ scale: 0.92 }] })
  .reduceMotion(ReduceMotion.System);
const SEARCH_MARKER_EXITING = FadeOut.duration(140).reduceMotion(
  ReduceMotion.System,
);

export const ParkingMarkerOverlay = memo(function ParkingMarkerOverlay({
  detailLevel,
  isMapMoving,
  isSearchRecommendationMode,
  onMarkerPress,
  onZoneSummaryPress,
  projectedMarkers,
  projectedZoneSummaries,
  selectedParkingItemId,
}: ParkingMarkerOverlayProps) {
  const performanceMode = isMapMoving ? 'moving' : 'normal';

  return (
    <>
      <View
        pointerEvents="box-none"
        style={{
          elevation: MAP_ELEVATIONS.markers,
          position: 'absolute',
          inset: 0,
          zIndex: MAP_LAYERS.markers,
        }}
      >
        <Animated.View
          key={`marker-layer-${detailLevel}`}
          entering={DETAIL_LAYER_ENTERING}
          exiting={DETAIL_LAYER_EXITING}
          pointerEvents="box-none"
          style={{ flex: 1 }}
        >
          {projectedMarkers.map(({ item, x, y, width, height, tier }) => (
            <View
              key={item.id}
              pointerEvents="box-none"
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                transform: [
                  { translateX: x - width / 2 },
                  { translateY: y - height / 2 },
                ],
                width,
                height,
                zIndex: selectedParkingItemId === item.id ? 2 : 1,
              }}
            >
              {isSearchRecommendationMode ? (
                <Animated.View
                  entering={SEARCH_MARKER_ENTERING}
                  exiting={SEARCH_MARKER_EXITING}
                  pointerEvents="box-none"
                  style={{ flex: 1 }}
                >
                  <ParkingMarkerCard
                    item={item}
                    onPress={onMarkerPress}
                    performanceMode={performanceMode}
                    selected={false}
                    tier={tier}
                  />
                </Animated.View>
              ) : (
                <ParkingMarkerCard
                  item={item}
                  onPress={onMarkerPress}
                  performanceMode={performanceMode}
                  selected={selectedParkingItemId === item.id}
                  tier={tier}
                />
              )}
            </View>
          ))}
        </Animated.View>
      </View>

      <View
        pointerEvents="box-none"
        style={{
          elevation: MAP_ELEVATIONS.markers,
          position: 'absolute',
          inset: 0,
          zIndex: MAP_LAYERS.markers,
        }}
      >
        {projectedZoneSummaries.length > 0 ? (
          <Animated.View
            entering={DETAIL_LAYER_ENTERING}
            exiting={DETAIL_LAYER_EXITING}
            pointerEvents="box-none"
            style={{ flex: 1 }}
          >
            {projectedZoneSummaries.map(({ summary, x, y }) => (
              <View
                key={summary.zoneId}
                pointerEvents="box-none"
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  transform: [
                    {
                      translateX:
                        x - ZONE_SUMMARY_MARKER_SIZE.width / 2,
                    },
                    {
                      translateY:
                        y - ZONE_SUMMARY_MARKER_SIZE.height / 2,
                    },
                  ],
                  width: ZONE_SUMMARY_MARKER_SIZE.width,
                  height: ZONE_SUMMARY_MARKER_SIZE.height,
                }}
              >
                <ZoneSummaryMarker
                  onPress={onZoneSummaryPress}
                  summary={summary}
                />
              </View>
            ))}
          </Animated.View>
        ) : null}
      </View>
    </>
  );
});
