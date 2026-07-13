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
import type { FavoriteParkingReference } from '@/types/parking-domain';
import { fetchParkingSegmentDetails } from '@/services/parkingMapData';
import {
  clearStoredFavorites,
  loadStoredFavoriteState,
  saveFavoriteState,
  type StoredFavoriteParkingItem,
} from '@/utils/favorite-parking-storage';
import { parkingMapFeatureToLegacyResponse } from '@/utils/parking-feature-adapters';
import { parkingSegmentToSummary } from '@/utils/parking-segments';

type FavoriteParkingContextValue = {
  favoriteItems: ParkingClusterResponse[];
  favoriteReferences: FavoriteParkingReference[];
  favoriteIds: Set<string>;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (item: ParkingClusterResponse) => void;
  addFavorite: (item: ParkingClusterResponse) => void;
  removeFavorite: (id: string) => void;
  clearFavorites: () => void;
  refreshFavorites: () => Promise<void>;
};

const FavoriteParkingContext =
  createContext<FavoriteParkingContextValue | null>(null);

export function FavoriteParkingProvider({ children }: PropsWithChildren) {
  const [favorites, setFavorites] = useState<StoredFavoriteParkingItem[]>([]);
  const favoritesRef = useRef(favorites);
  favoritesRef.current = favorites;
  const hydratedRef = useRef(false);
  const interactedRef = useRef(false);
  const writeQueueRef = useRef(Promise.resolve());

  useEffect(() => {
    let cancelled = false;

    loadStoredFavoriteState()
      .then((storedState) => {
        // A user mutation that lands before hydration wins over stored data.
        hydratedRef.current = true;
        if (
          !cancelled &&
          !interactedRef.current &&
          storedState.favorites.length > 0
        ) {
          setFavorites(storedState.favorites);
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
      .then(() => saveFavoriteState({ version: 2, favorites }))
      .catch((error: unknown) => {
        if (__DEV__) {
          console.warn(
            '[FavoriteParkingProvider] failed to save favorites',
            error,
          );
        }
      });
  }, [favorites]);

  const favoriteItems = useMemo(
    () =>
      favorites.flatMap(({ cachedItem }) =>
        cachedItem === null ? [] : [cachedItem],
      ),
    [favorites],
  );
  const favoriteReferences = useMemo(
    () => favorites.map(({ reference }) => reference),
    [favorites],
  );

  const favoriteIds = useMemo(
    () => new Set(favorites.map((item) => item.reference.entityId)),
    [favorites],
  );

  const isFavorite = useCallback(
    (id: string) => favoriteIds.has(id),
    [favoriteIds],
  );

  const addFavorite = useCallback((item: ParkingClusterResponse) => {
    interactedRef.current = true;
    setFavorites((current) => [
      {
        reference: {
          entityId: item.id,
          entityType: 'segment',
          createdAt: new Date().toISOString(),
        },
        cachedItem: item,
      },
      ...current.filter(
        (favorite) => favorite.reference.entityId !== item.id,
      ),
    ]);
  }, []);

  const removeFavorite = useCallback((id: string) => {
    interactedRef.current = true;
    setFavorites((current) =>
      current.filter((favorite) => favorite.reference.entityId !== id),
    );
  }, []);

  const toggleFavorite = useCallback((item: ParkingClusterResponse) => {
    interactedRef.current = true;
    setFavorites((current) => {
      const exists = current.some(
        (favorite) => favorite.reference.entityId === item.id,
      );

      if (exists) {
        return current.filter(
          (favorite) => favorite.reference.entityId !== item.id,
        );
      }

      return [
        {
          reference: {
            entityId: item.id,
            entityType: 'segment',
            createdAt: new Date().toISOString(),
          },
          cachedItem: item,
        },
        ...current,
      ];
    });
  }, []);

  const clearFavorites = useCallback(() => {
    interactedRef.current = true;
    setFavorites((current) => (current.length === 0 ? current : []));

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

  const refreshFavorites = useCallback(async () => {
    const snapshot = favoritesRef.current;
    const refreshed = await Promise.all(
      snapshot.map(async (favorite) => {
        if (favorite.reference.entityType !== 'segment') {
          return favorite;
        }
        try {
          const detail = await fetchParkingSegmentDetails(
            favorite.reference.entityId,
          );
          if (detail === null) {
            return favorite;
          }
          const segment = parkingSegmentToSummary(detail);
          const cachedItem = parkingMapFeatureToLegacyResponse({
            id: segment.id,
            kind: 'segment',
            coordinates: segment.coordinates,
            stats: {
              segmentCount: 1,
              totalCapacity: segment.capacity,
              availableCapacity: segment.availability.availableSpaces,
              availabilityPercent: segment.availability.percent,
              pricing: {
                minimumHourlyRate:
                  segment.pricing.status === 'paid'
                    ? segment.pricing.hourlyRate
                    : null,
                maximumHourlyRate:
                  segment.pricing.status === 'paid'
                    ? segment.pricing.hourlyRate
                    : null,
                hasFreeParking: segment.pricing.status === 'free',
                hasUnknownPricing: segment.pricing.status === 'unknown',
              },
              availabilityStatus: segment.availability.status,
              updatedAt: segment.updatedAt,
            },
            parentId: segment.zoneId,
            segment,
          });
          return { ...favorite, cachedItem };
        } catch {
          return favorite;
        }
      }),
    );
    setFavorites((current) =>
      current === snapshot ? refreshed : current,
    );
  }, []);

  const value = useMemo(
    () => ({
      favoriteItems,
      favoriteReferences,
      favoriteIds,
      isFavorite,
      toggleFavorite,
      addFavorite,
      removeFavorite,
      clearFavorites,
      refreshFavorites,
    }),
    [
      addFavorite,
      clearFavorites,
      favoriteIds,
      favoriteItems,
      favoriteReferences,
      isFavorite,
      removeFavorite,
      refreshFavorites,
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
