import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  fetchPlaceAutocomplete,
  fetchPlaceDetails,
  type PlaceSearchResult,
  type PlaceSearchSuggestion,
} from '@/services/googlePlaces';
import {
  logAppError,
  normalizeAppError,
} from '@/utils/app-errors';

export type { PlaceSearchResult, PlaceSearchSuggestion };

const SEARCH_DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 3;

function normalizeQuery(query: string) {
  return query.trim();
}

function createSearchSessionToken() {
  return `places-${Date.now()}-${Math.random().toString(36).slice(2)}`;
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
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      autocompleteRequestIdRef.current += 1;
      detailsRequestIdRef.current += 1;
      autocompleteAbortRef.current?.abort();
      detailsAbortRef.current?.abort();
      autocompleteAbortRef.current = null;
      detailsAbortRef.current = null;
    };
  }, []);

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
        if (
          !isMountedRef.current ||
          requestId !== autocompleteRequestIdRef.current
        ) {
          return;
        }

        setSuggestions(nextSuggestions);
      })
      .catch((searchError: unknown) => {
        if (
          !isMountedRef.current ||
          requestId !== autocompleteRequestIdRef.current ||
          abortController.signal.aborted
        ) {
          return;
        }

        setSuggestions([]);
        const normalized = normalizeAppError(searchError, 'place-search');
        setError(normalized.message);
        logAppError('place-search', searchError);
      })
      .finally(() => {
        if (
          isMountedRef.current &&
          requestId === autocompleteRequestIdRef.current
        ) {
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

        if (
          !isMountedRef.current ||
          requestId !== detailsRequestIdRef.current
        ) {
          return null;
        }

        setSelectedPlace(place);
        setSessionToken(createSearchSessionToken());
        return place;
      } catch (detailsError: unknown) {
        if (
          !isMountedRef.current ||
          requestId !== detailsRequestIdRef.current ||
          abortController.signal.aborted
        ) {
          return null;
        }

        const normalized = normalizeAppError(
          detailsError,
          'place-details',
        );
        setError(normalized.message);
        logAppError('place-details', detailsError);
        return null;
      } finally {
        if (
          isMountedRef.current &&
          requestId === detailsRequestIdRef.current
        ) {
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
