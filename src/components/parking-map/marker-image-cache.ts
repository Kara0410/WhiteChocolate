import { Image as ExpoImage, type ImageRef } from 'expo-image';

import type {
  AvailabilityColorStatus,
  ParkingClusterResponse,
} from '@/types/parking-map';

const MARKER_ASSETS: Record<
  ParkingClusterResponse['type'],
  Record<AvailabilityColorStatus, number>
> = {
  cluster: {
    green: require('../../../assets/images/parking-markers/cluster-green.png'),
    orange: require('../../../assets/images/parking-markers/cluster-orange.png'),
    red: require('../../../assets/images/parking-markers/cluster-red.png'),
  },
  spot: {
    green: require('../../../assets/images/parking-markers/spot-green.png'),
    orange: require('../../../assets/images/parking-markers/spot-orange.png'),
    red: require('../../../assets/images/parking-markers/spot-red.png'),
  },
};

const imagePromises = new Map<string, Promise<ImageRef>>();

export function markerImageKey(item: ParkingClusterResponse) {
  return `mock-marker:${item.type}:${item.colorStatus}`;
}

export function loadMarkerImage(item: ParkingClusterResponse) {
  const key = markerImageKey(item);
  const existing = imagePromises.get(key);
  if (existing) {
    return existing;
  }

  const promise = ExpoImage.loadAsync(
    MARKER_ASSETS[item.type][item.colorStatus],
  ).catch((error) => {
    imagePromises.delete(key);
    throw error;
  });
  imagePromises.set(key, promise);
  return promise;
}
