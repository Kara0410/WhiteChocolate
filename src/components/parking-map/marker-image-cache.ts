import { Image as ExpoImage, type ImageRef } from 'expo-image';

import { markerImageKey } from '@/components/parking-map/marker-visuals';
import { PARKING_MARKER_ASSETS } from '@/components/parking-map/parking-marker-assets.generated';
import type { ParkingClusterResponse } from '@/types/parking-map';

const imagePromises = new Map<string, Promise<ImageRef>>();
const MAX_MARKER_IMAGE_CACHE_ENTRIES = 160;

export { markerImageKey };

export function loadMarkerImage(
  item: ParkingClusterResponse,
  zoom: number,
  selected = false,
) {
  const key = markerImageKey(item, zoom, selected);
  const existing = imagePromises.get(key);
  if (existing) {
    return existing;
  }

  const asset = PARKING_MARKER_ASSETS[key];
  if (!asset) {
    throw new Error(`Missing bundled parking marker asset: ${key}`);
  }

  const promise = ExpoImage.loadAsync(asset).catch((error) => {
    imagePromises.delete(key);
    throw error;
  });
  imagePromises.set(key, promise);

  if (imagePromises.size > MAX_MARKER_IMAGE_CACHE_ENTRIES) {
    const oldestKey = imagePromises.keys().next().value;
    if (oldestKey && oldestKey !== key) {
      imagePromises.delete(oldestKey);
    }
  }

  return promise;
}
