import { getParkingClusters } from '@/server/parking-cluster-service';
import {
  getCachedClusters,
  setCachedClusters,
} from '@/server/parking-tile-cache';
import type { ParkingBoundingBox } from '@/types/parking-map';
import {
  clampZoom,
  latitudeToTileY,
  longitudeToTileX,
} from '@/utils/parking-map-geo';

function parseBbox(value: string | null): ParkingBoundingBox | null {
  if (!value) {
    return null;
  }

  const values = value.split(',').map(Number);
  if (values.length !== 4 || values.some((item) => !Number.isFinite(item))) {
    return null;
  }

  const [minLng, minLat, maxLng, maxLat] = values;
  if (
    minLng >= maxLng ||
    minLat >= maxLat ||
    minLng < -180 ||
    maxLng > 180 ||
    minLat < -85.05112878 ||
    maxLat > 85.05112878
  ) {
    return null;
  }

  return { minLng, minLat, maxLng, maxLat };
}

function cacheKeyFor(bbox: ParkingBoundingBox, zoom: number) {
  const centerLng = (bbox.minLng + bbox.maxLng) / 2;
  const centerLat = (bbox.minLat + bbox.maxLat) / 2;
  const tileX = Math.floor(longitudeToTileX(centerLng, zoom));
  const tileY = Math.floor(latitudeToTileY(centerLat, zoom));
  return `parking:clusters:z${zoom}:x${tileX}:y${tileY}`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const bbox = parseBbox(url.searchParams.get('bbox'));
  const rawZoom = Number(url.searchParams.get('zoom'));

  if (!bbox || !Number.isFinite(rawZoom)) {
    return Response.json(
      { error: 'Expected bbox=minLng,minLat,maxLng,maxLat and numeric zoom.' },
      { status: 400 },
    );
  }

  const zoom = clampZoom(rawZoom);
  const cacheKey = cacheKeyFor(bbox, zoom);
  const cached = await getCachedClusters(cacheKey);

  if (cached) {
    return Response.json(cached, {
      headers: {
        'Cache-Control': 'public, max-age=15, stale-while-revalidate=60',
        'X-Parking-Cache': 'HIT',
        'X-Parking-Tile': cacheKey,
      },
    });
  }

  try {
    const clusters = await getParkingClusters(bbox, zoom);
    await setCachedClusters(cacheKey, clusters);

    return Response.json(clusters, {
      headers: {
        'Cache-Control': 'public, max-age=15, stale-while-revalidate=60',
        'X-Parking-Cache': 'MISS',
        'X-Parking-Tile': cacheKey,
      },
    });
  } catch (error) {
    console.error('Parking cluster request failed', error);
    return Response.json(
      { error: 'Parking clusters are temporarily unavailable.' },
      { status: 500 },
    );
  }
}
