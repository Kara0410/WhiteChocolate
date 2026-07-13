import type { ParkingSemanticZoomStage } from '@/components/parking-map/map-detail-level';
import type { ParkingMapFeature } from '@/types/parking-domain';

export type ParkingLayerStatus =
  | 'idle'
  | 'loading'
  | 'refreshing'
  | 'error';

export type ParkingLayerState = {
  activeStage: ParkingSemanticZoomStage;
  visibleStage: ParkingSemanticZoomStage;
  visibleFeatures: ParkingMapFeature[];
  outgoingFeatures: ParkingMapFeature[];
  status: ParkingLayerStatus;
  requestKey: string | null;
  error: string | null;
};

export type ParkingLayerAction =
  | {
      type: 'request';
      stage: ParkingSemanticZoomStage;
      requestKey: string;
    }
  | {
      type: 'resolve';
      stage: ParkingSemanticZoomStage;
      requestKey: string;
      features: ParkingMapFeature[];
    }
  | { type: 'reject'; requestKey: string; error: string }
  | { type: 'clear-outgoing' };

export function parkingLayerReducer(
  state: ParkingLayerState,
  action: ParkingLayerAction,
): ParkingLayerState {
  switch (action.type) {
    case 'request':
      return {
        ...state,
        activeStage: action.stage,
        status:
          state.visibleFeatures.length > 0 ? 'refreshing' : 'loading',
        requestKey: action.requestKey,
        error: null,
      };
    case 'resolve':
      if (state.requestKey !== action.requestKey) {
        return state;
      }
      return {
        activeStage: action.stage,
        visibleStage: action.stage,
        visibleFeatures: action.features,
        outgoingFeatures: state.visibleFeatures,
        status: 'idle',
        requestKey: action.requestKey,
        error: null,
      };
    case 'reject':
      if (state.requestKey !== action.requestKey) {
        return state;
      }
      return {
        ...state,
        activeStage: state.visibleStage,
        status: 'error',
        error: action.error,
      };
    case 'clear-outgoing':
      return state.outgoingFeatures.length === 0
        ? state
        : { ...state, outgoingFeatures: [] };
  }
}
