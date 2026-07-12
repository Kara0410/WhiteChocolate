import type { KeyValueStorage } from '../../src/types/storage';

export type MemoryStorage = KeyValueStorage & {
  data: Map<string, string>;
};

export function createMemoryStorage(): MemoryStorage {
  const data = new Map<string, string>();

  return {
    data,
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => {
      data.set(key, value);
    },
    removeItem: async (key) => {
      data.delete(key);
    },
  };
}

export function createFailingSetItemStorage(error = new Error('set failed')) {
  const storage = createMemoryStorage();

  return {
    ...storage,
    setItem: async () => {
      throw error;
    },
  };
}
