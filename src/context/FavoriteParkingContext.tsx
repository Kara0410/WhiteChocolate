import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import type { ParkingClusterResponse } from '@/types/parking-map';

type FavoriteParkingContextValue = {
  favoriteItems: ParkingClusterResponse[];
  favoriteIds: Set<string>;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (item: ParkingClusterResponse) => void;
  addFavorite: (item: ParkingClusterResponse) => void;
  removeFavorite: (id: string) => void;
};

const FavoriteParkingContext =
  createContext<FavoriteParkingContextValue | null>(null);

export function FavoriteParkingProvider({ children }: PropsWithChildren) {
  const [favoriteItems, setFavoriteItems] = useState<ParkingClusterResponse[]>(
    [],
  );

  const favoriteIds = useMemo(
    () => new Set(favoriteItems.map((item) => item.id)),
    [favoriteItems],
  );

  const isFavorite = useCallback(
    (id: string) => favoriteIds.has(id),
    [favoriteIds],
  );

  const addFavorite = useCallback((item: ParkingClusterResponse) => {
    setFavoriteItems((current) => [
      item,
      ...current.filter((favorite) => favorite.id !== item.id),
    ]);
  }, []);

  const removeFavorite = useCallback((id: string) => {
    setFavoriteItems((current) =>
      current.filter((favorite) => favorite.id !== id),
    );
  }, []);

  const toggleFavorite = useCallback((item: ParkingClusterResponse) => {
    setFavoriteItems((current) => {
      const exists = current.some((favorite) => favorite.id === item.id);

      if (exists) {
        return current.filter((favorite) => favorite.id !== item.id);
      }

      return [item, ...current];
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
    }),
    [
      addFavorite,
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
