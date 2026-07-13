export type ParkingCacheEntry<T> = {
  value: T;
  cachedAt: number;
  expiresAt: number;
};

export class ParkingMapDataCache {
  private readonly entries = new Map<string, ParkingCacheEntry<unknown>>();

  constructor(private readonly maximumEntries = 80) {}

  get<T>(key: string, now = Date.now()) {
    const entry = this.entries.get(key) as ParkingCacheEntry<T> | undefined;
    if (!entry) {
      return null;
    }
    this.entries.delete(key);
    this.entries.set(key, entry);
    return { ...entry, isFresh: entry.expiresAt > now };
  }

  set<T>(key: string, value: T, ttlMs: number, now = Date.now()) {
    this.entries.delete(key);
    this.entries.set(key, {
      value,
      cachedAt: now,
      expiresAt: now + Math.max(0, ttlMs),
    });
    while (this.entries.size > this.maximumEntries) {
      const oldestKey = this.entries.keys().next().value;
      if (oldestKey === undefined) {
        break;
      }
      this.entries.delete(oldestKey);
    }
  }

  clear() {
    this.entries.clear();
  }

  get size() {
    return this.entries.size;
  }
}

export const parkingMapDataCache = new ParkingMapDataCache();
