import type { ParkingClusterResponse } from '@/types/parking-map';

type CacheEntry = {
  expiresAt: number;
  value: ParkingClusterResponse[];
};

const memoryCache = new Map<string, CacheEntry>();
const CACHE_TTL_SECONDS = 30;

async function readUpstash(key: string) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  const response = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as { result?: string | null };
  return payload.result
    ? (JSON.parse(payload.result) as ParkingClusterResponse[])
    : null;
}

async function writeUpstash(key: string, value: ParkingClusterResponse[]) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return false;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([
      'SETEX',
      key,
      CACHE_TTL_SECONDS,
      JSON.stringify(value),
    ]),
  });

  return response.ok;
}

export async function getCachedClusters(key: string) {
  const remote = await readUpstash(key);
  if (remote) {
    return remote;
  }

  const local = memoryCache.get(key);
  if (!local || local.expiresAt <= Date.now()) {
    memoryCache.delete(key);
    return null;
  }

  return local.value;
}

export async function setCachedClusters(
  key: string,
  value: ParkingClusterResponse[],
) {
  memoryCache.set(key, {
    expiresAt: Date.now() + CACHE_TTL_SECONDS * 1000,
    value,
  });

  await writeUpstash(key, value);
}
