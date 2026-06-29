import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';

import type { PlaceSearchResult } from '@/hooks/use-google-place-search';

type SearchSelection = {
  id: number;
  place: PlaceSearchResult;
};

type MapSearchContextValue = {
  isSearchActive: boolean;
  openSearch: () => void;
  closeSearch: () => void;
  consumeSelection: (id: number) => void;
  selectPlace: (place: PlaceSearchResult) => void;
  selection: SearchSelection | null;
};

const MapSearchContext = createContext<MapSearchContextValue | null>(null);

export function MapSearchProvider({ children }: PropsWithChildren) {
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [selection, setSelection] = useState<SearchSelection | null>(null);
  const selectionIdRef = useRef(0);

  const openSearch = useCallback(() => {
    setIsSearchActive(true);
  }, []);

  const closeSearch = useCallback(() => {
    setIsSearchActive(false);
  }, []);

  const consumeSelection = useCallback((id: number) => {
    setSelection((current) => (current?.id === id ? null : current));
  }, []);

  const selectPlace = useCallback((place: PlaceSearchResult) => {
    selectionIdRef.current += 1;
    setSelection({
      id: selectionIdRef.current,
      place,
    });
    setIsSearchActive(false);
  }, []);

  const value = useMemo(
    () => ({
      closeSearch,
      consumeSelection,
      isSearchActive,
      openSearch,
      selectPlace,
      selection,
    }),
    [
      closeSearch,
      consumeSelection,
      isSearchActive,
      openSearch,
      selectPlace,
      selection,
    ],
  );

  return (
    <MapSearchContext.Provider value={value}>
      {children}
    </MapSearchContext.Provider>
  );
}

export function useMapSearch() {
  const value = useContext(MapSearchContext);

  if (!value) {
    throw new Error('useMapSearch must be used within MapSearchProvider');
  }

  return value;
}
