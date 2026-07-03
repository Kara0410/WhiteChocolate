import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';

import type { ParkingClusterResponse } from '@/types/parking-map';
import {
  clearStoredFavorites,
  loadStoredFavorites,
  saveFavorites,
} from '@/utils/favorite-parking-storage';

type FavoriteParkingContextValue = {
  favoriteItems: ParkingClusterResponse[];
  favoriteIds: Set<string>;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (item: ParkingClusterResponse) => void;
  addFavorite: (item: ParkingClusterResponse) => void;
  removeFavorite: (id: string) => void;
  clearFavorites: () => void;
};

const FavoriteParkingContext =
  createContext<FavoriteParkingContextValue | null>(null);

export function FavoriteParkingProvider({ children }: PropsWithChildren) {
  const [favoriteItems, setFavoriteItems] = useState<ParkingClusterResponse[]>(
    [],
  );
  const hydratedRef = useRef(false);
  const interactedRef = useRef(false);
  const writeQueueRef = useRef(Promise.resolve());

  useEffect(() => {
    let cancelled = false;

    loadStoredFavorites()
      .then((storedFavorites) => {
        // A user mutation that lands before hydration wins over stored data.
        hydratedRef.current = true;
        if (
          !cancelled &&
          !interactedRef.current &&
          storedFavorites.length > 0
        ) {
          setFavoriteItems(storedFavorites);
        }
      })
      .catch((error: unknown) => {
        hydratedRef.current = true;
        if (__DEV__) {
          console.warn(
            '[FavoriteParkingProvider] failed to load stored favorites',
            error,
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) {
      return;
    }

    writeQueueRef.current = writeQueueRef.current
      .then(() => saveFavorites(favoriteItems))
      .catch((error: unknown) => {
        if (__DEV__) {
          console.warn(
            '[FavoriteParkingProvider] failed to save favorites',
            error,
          );
        }
      });
  }, [favoriteItems]);

  const favoriteIds = useMemo(
    () => new Set(favoriteItems.map((item) => item.id)),
    [favoriteItems],
  );

  const isFavorite = useCallback(
    (id: string) => favoriteIds.has(id),
    [favoriteIds],
  );

  const addFavorite = useCallback((item: ParkingClusterResponse) => {
    interactedRef.current = true;
    setFavoriteItems((current) => [
      item,
      ...current.filter((favorite) => favorite.id !== item.id),
    ]);
  }, []);

  const removeFavorite = useCallback((id: string) => {
    interactedRef.current = true;
    setFavoriteItems((current) =>
      current.filter((favorite) => favorite.id !== id),
    );
  }, []);

  const toggleFavorite = useCallback((item: ParkingClusterResponse) => {
    interactedRef.current = true;
    setFavoriteItems((current) => {
      const exists = current.some((favorite) => favorite.id === item.id);

      if (exists) {
        return current.filter((favorite) => favorite.id !== item.id);
      }

      return [item, ...current];
    });
  }, []);

  const clearFavorites = useCallback(() => {
    interactedRef.current = true;
    setFavoriteItems((current) => (current.length === 0 ? current : []));

    // Clear the stored key directly as well, so the data is removed even
    // if clearing happens before hydration enables the autosave effect.
    writeQueueRef.current = writeQueueRef.current
      .then(() => clearStoredFavorites())
      .catch((error: unknown) => {
        if (__DEV__) {
          console.warn(
            '[FavoriteParkingProvider] failed to clear stored favorites',
            error,
          );
        }
      });
  }, []);

  const value = useMemo(
    () => ({
      favoriteItems,
      favoriteIds,
      isFavorite,
      toggleFavorite,
      addFavorite,
      removeFavorite,
      clearFavorites,
    }),
    [
      addFavorite,
      clearFavorites,
      favoriteIds,
      favoriteItems,
      isFavorite,
      removeFavorite,
      toggleFavorite,
    ],
  );

  return (
    <FavoriteParkingContext.Provider value={value}>
      {children}
    </FavoriteParkingContext.Provider>
  );
}

export function useFavoriteParking() {
  const context = useContext(FavoriteParkingContext);

  if (context === null) {
    throw new Error(
      'useFavoriteParking must be used within FavoriteParkingProvider',
    );
  }

  return context;
}
