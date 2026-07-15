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
import type { AppActionResult, AppError } from '@/types/app-error';
import { fetchParkingSegmentDetails } from '@/services/parkingMapData';
import {
  clearStoredFavorites,
  loadStoredFavoriteState,
  saveFavoriteState,
  type StoredFavoriteParkingItem,
} from '@/utils/favorite-parking-storage';
import { parkingMapFeatureToLegacyResponse } from '@/utils/parking-feature-adapters';
import { parkingSegmentToSummary } from '@/utils/parking-segments';
import { logAppError, normalizeAppError } from '@/utils/app-errors';

type FavoriteParkingContextValue = {
  favoriteItems: ParkingClusterResponse[];
  favoriteReferences: FavoriteParkingReference[];
  favoriteIds: Set<string>;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (item: ParkingClusterResponse) => void;
  addFavorite: (item: ParkingClusterResponse) => void;
  removeFavorite: (id: string) => void;
  clearFavorites: () => Promise<AppActionResult>;
  refreshFavorites: () => Promise<AppActionResult>;
  error: AppError | null;
  persistenceStatus: 'idle' | 'hydrating' | 'saving' | 'refreshing' | 'error';
};

const FavoriteParkingContext =
  createContext<FavoriteParkingContextValue | null>(null);

export function FavoriteParkingProvider({ children }: PropsWithChildren) {
  const [favorites, setFavorites] = useState<StoredFavoriteParkingItem[]>([]);
  const [error, setError] = useState<AppError | null>(null);
  const [persistenceStatus, setPersistenceStatus] = useState<
    'idle' | 'hydrating' | 'saving' | 'refreshing' | 'error'
  >('hydrating');
  const favoritesRef = useRef(favorites);
  favoritesRef.current = favorites;
  const hydratedRef = useRef(false);
  const interactedRef = useRef(false);
  const writeQueueRef = useRef(Promise.resolve());
  const latestWriteRef = useRef(0);

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
        setPersistenceStatus('idle');
      })
      .catch((error: unknown) => {
        hydratedRef.current = true;
        setError(normalizeAppError(error, 'favorite-hydration'));
        setPersistenceStatus('error');
        logAppError('favorite-hydration', error);
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
      .then(() => saveFavoriteState({ version: 2, favorites }));
    const writeId = ++latestWriteRef.current;
    setPersistenceStatus('saving');
    setError(null);
    writeQueueRef.current = writeQueueRef.current.then(
      () => {
        if (writeId === latestWriteRef.current) {
          setPersistenceStatus('idle');
        }
      },
      (saveError: unknown) => {
        if (writeId === latestWriteRef.current) {
          setError(normalizeAppError(saveError, 'favorite-save'));
          setPersistenceStatus('error');
        }
        logAppError('favorite-save', saveError);
      },
    ).then(() => undefined);
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

  const clearFavorites = useCallback((): Promise<AppActionResult> => {
    interactedRef.current = true;
    setFavorites((current) => (current.length === 0 ? current : []));
    setError(null);
    setPersistenceStatus('saving');

    // Clear the stored key directly as well, so the data is removed even
    // if clearing happens before hydration enables the autosave effect.
    const clearPromise = writeQueueRef.current
      .then(() => clearStoredFavorites())
    const resultPromise = clearPromise.then(
      () => {
        setPersistenceStatus('idle');
        return { ok: true } as const;
      },
      (clearError: unknown) => {
        const normalized = normalizeAppError(clearError, 'favorite-clear');
        setError(normalized);
        setPersistenceStatus('error');
        logAppError('favorite-clear', clearError);
        return { ok: false, error: normalized } as const;
      },
    );
    writeQueueRef.current = resultPromise.then(() => undefined);
    return resultPromise;
  }, []);

  const refreshFavorites = useCallback(async (): Promise<AppActionResult> => {
    const snapshot = favoritesRef.current;
    setError(null);
    setPersistenceStatus('refreshing');
    let hadError = false;
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
        } catch (refreshError) {
          hadError = true;
          logAppError('favorite-refresh', refreshError, {
            favoriteId: favorite.reference.entityId,
          });
          return favorite;
        }
      }),
    );
    setFavorites((current) =>
      current === snapshot ? refreshed : current,
    );
    if (hadError) {
      const normalized = normalizeAppError(
        new Error('Favorite refresh failed.'),
        'favorite-refresh',
      );
      setError(normalized);
      setPersistenceStatus('error');
      return { ok: false, error: normalized };
    }
    setPersistenceStatus('idle');
    return { ok: true };
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
      error,
      persistenceStatus,
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
      error,
      persistenceStatus,
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
