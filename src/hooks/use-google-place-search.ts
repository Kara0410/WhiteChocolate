import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  fetchPlaceAutocomplete,
  fetchPlaceDetails,
  type PlaceSearchResult,
  type PlaceSearchSuggestion,
} from '@/services/googlePlaces';

export type { PlaceSearchResult, PlaceSearchSuggestion };

const SEARCH_DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 3;

function normalizeQuery(query: string) {
  return query.trim();
}

function createSearchSessionToken() {
  return `places-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function userFriendlySearchError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '');

  if (message.includes('EXPO_PUBLIC_GOOGLE_PLACES_API_KEY')) {
    return 'Google Places is not configured. Set EXPO_PUBLIC_GOOGLE_PLACES_API_KEY.';
  }

  if (
    message.includes('Android client application <empty>') ||
    message.includes('are blocked')
  ) {
    return 'Google Places needs a separate Places API key. The current key is restricted to Android Maps SDK requests.';
  }

  if (
    message.includes('API key') ||
    message.includes('REQUEST_DENIED') ||
    message.includes('PERMISSION_DENIED')
  ) {
    return 'Google Places is not available for this app key.';
  }

  if (message.includes('quota') || message.includes('RESOURCE_EXHAUSTED')) {
    return 'Search is temporarily unavailable. Try again later.';
  }

  return 'Search failed. Try another place or address.';
}

function shouldWarnForSearchError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '');

  return (
    !message.includes('EXPO_PUBLIC_GOOGLE_PLACES_API_KEY') &&
    !message.includes('Android client application <empty>') &&
    !message.includes('are blocked')
  );
}

export function useGooglePlaceSearch() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSearchSuggestion[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlaceSearchResult | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isResolvingPlace, setIsResolvingPlace] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState(createSearchSessionToken);
  const autocompleteRequestIdRef = useRef(0);
  const detailsRequestIdRef = useRef(0);
  const autocompleteAbortRef = useRef<AbortController | null>(null);
  const detailsAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(normalizeQuery(query));
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const searchQuery = debouncedQuery;
    const requestId = (autocompleteRequestIdRef.current += 1);
    autocompleteAbortRef.current?.abort();

    if (searchQuery.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    const abortController = new AbortController();
    autocompleteAbortRef.current = abortController;
    setIsLoading(true);
    setError(null);

    fetchPlaceAutocomplete({
      input: searchQuery,
      sessionToken,
      signal: abortController.signal,
    })
      .then((nextSuggestions) => {
        if (requestId !== autocompleteRequestIdRef.current) {
          return;
        }

        setSuggestions(nextSuggestions);
      })
      .catch((searchError: unknown) => {
        if (
          requestId !== autocompleteRequestIdRef.current ||
          abortController.signal.aborted
        ) {
          return;
        }

        setSuggestions([]);
        setError(userFriendlySearchError(searchError));
        if (__DEV__ && shouldWarnForSearchError(searchError)) {
          console.warn('Unable to search places', searchError);
        }
      })
      .finally(() => {
        if (requestId === autocompleteRequestIdRef.current) {
          setIsLoading(false);
        }
      });

    return () => {
      abortController.abort();
    };
  }, [debouncedQuery, sessionToken]);

  const beginSearchSession = useCallback(() => {
    setSessionToken(createSearchSessionToken());
  }, []);

  const resetSearch = useCallback(() => {
    autocompleteRequestIdRef.current += 1;
    detailsRequestIdRef.current += 1;
    autocompleteAbortRef.current?.abort();
    detailsAbortRef.current?.abort();
    autocompleteAbortRef.current = null;
    detailsAbortRef.current = null;
    setQuery('');
    setDebouncedQuery('');
    setSuggestions([]);
    setSelectedPlace(null);
    setError(null);
    setIsLoading(false);
    setIsResolvingPlace(false);
    setSessionToken(createSearchSessionToken());
  }, []);

  const selectSuggestion = useCallback(
    async (suggestion: PlaceSearchSuggestion) => {
      const requestId = (detailsRequestIdRef.current += 1);
      detailsAbortRef.current?.abort();
      const abortController = new AbortController();
      detailsAbortRef.current = abortController;
      setIsResolvingPlace(true);
      setError(null);

      try {
        const place = await fetchPlaceDetails({
          placeId: suggestion.placeId,
          sessionToken,
          signal: abortController.signal,
        });

        if (requestId !== detailsRequestIdRef.current) {
          return null;
        }

        setSelectedPlace(place);
        setSessionToken(createSearchSessionToken());
        return place;
      } catch (detailsError: unknown) {
        if (
          requestId !== detailsRequestIdRef.current ||
          abortController.signal.aborted
        ) {
          return null;
        }

        setError(userFriendlySearchError(detailsError));
        if (__DEV__ && shouldWarnForSearchError(detailsError)) {
          console.warn('Unable to load place details', detailsError);
        }
        return null;
      } finally {
        if (requestId === detailsRequestIdRef.current) {
          setIsResolvingPlace(false);
        }
      }
    },
    [sessionToken],
  );

  const hasSearched = useMemo(
    () => debouncedQuery.length >= MIN_QUERY_LENGTH,
    [debouncedQuery],
  );

  return {
    beginSearchSession,
    debouncedQuery,
    error,
    hasSearched,
    isLoading,
    isResolvingPlace,
    query,
    resetSearch,
    results: suggestions,
    selectedPlace,
    selectSuggestion,
    setQuery,
    suggestions,
  };
}
