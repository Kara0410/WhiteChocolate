import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';

export type PlaceSearchResult = {
  id: string;
  title: string;
  subtitle?: string;
  latitude: number;
  longitude: number;
};

const SEARCH_DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 3;

function hasValidCoordinates(latitude: number, longitude: number) {
  return Number.isFinite(latitude) && Number.isFinite(longitude);
}

function normalizeQuery(query: string) {
  return query.trim();
}

function resultTitle(query: string) {
  return query.replace(/\s+/g, ' ');
}

function isLocationAuthorizationError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '');

  return (
    message.includes('Not authorized to use location services') ||
    message.includes('location services')
  );
}

async function ensureGeocodingPermission() {
  if (Platform.OS !== 'android') {
    return true;
  }

  const currentPermission = await Location.getForegroundPermissionsAsync();
  if (currentPermission.granted) {
    return true;
  }

  const requestedPermission =
    await Location.requestForegroundPermissionsAsync();
  return requestedPermission.granted;
}

export function usePlaceSearch() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(normalizeQuery(query));
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const searchQuery = debouncedQuery;
    const requestId = (requestIdRef.current += 1);

    if (searchQuery.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    let isCancelled = false;

    async function searchPlaces() {
      setIsLoading(true);
      setError(null);

      try {
        const hasPermission = await ensureGeocodingPermission();
        if (
          isCancelled ||
          requestId !== requestIdRef.current
        ) {
          return;
        }

        if (!hasPermission) {
          setResults([]);
          setError('Location permission is required for address search.');
          return;
        }

        const locations = await Location.geocodeAsync(searchQuery);
        if (requestId !== requestIdRef.current) {
          return;
        }

        const title = resultTitle(searchQuery);
        const seenCoordinates = new Set<string>();
        const nextResults = locations.reduce<PlaceSearchResult[]>(
          (accumulator, location, index) => {
            if (!hasValidCoordinates(location.latitude, location.longitude)) {
              return accumulator;
            }

            const coordinateKey = `${location.latitude.toFixed(5)}:${location.longitude.toFixed(5)}`;
            if (seenCoordinates.has(coordinateKey)) {
              return accumulator;
            }
            seenCoordinates.add(coordinateKey);

            accumulator.push({
              id: `${coordinateKey}:${index}`,
              title,
              subtitle: `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`,
              latitude: location.latitude,
              longitude: location.longitude,
            });
            return accumulator;
          },
          [],
        );

        setResults(nextResults);
      } catch (searchError: unknown) {
        if (requestId !== requestIdRef.current) {
          return;
        }

        setResults([]);
        setError(
          isLocationAuthorizationError(searchError)
            ? 'Location permission is required for address search.'
            : 'Search failed. Try another place or address.',
        );
        if (__DEV__ && !isLocationAuthorizationError(searchError)) {
          console.warn('Unable to search places', searchError);
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    }

    void searchPlaces();

    return () => {
      isCancelled = true;
    };
  }, [debouncedQuery]);

  const clear = useCallback(() => {
    requestIdRef.current += 1;
    setQuery('');
    setDebouncedQuery('');
    setResults([]);
    setError(null);
    setIsLoading(false);
  }, []);

  const hasSearched = useMemo(
    () => debouncedQuery.length >= MIN_QUERY_LENGTH,
    [debouncedQuery],
  );

  return {
    clear,
    debouncedQuery,
    error,
    hasSearched,
    isLoading,
    query,
    results,
    setQuery,
  };
}
