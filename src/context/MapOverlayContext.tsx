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

export type MapOverlayMode =
  | 'none'
  | 'parking'
  | 'favorites'
  | 'search';

export type FocusedMapSurface =
  | 'none'
  | 'parking-detail'
  | 'search-results';

type SearchSelection = {
  id: number;
  place: PlaceSearchResult;
};

type MapOverlayContextValue = {
  activeOverlay: MapOverlayMode;
  closeOverlay: () => void;
  closeSearch: () => void;
  consumeSelection: (id: number) => void;
  focusedMapSurface: FocusedMapSurface;
  isLocationLoading: boolean;
  isSearchActive: boolean;
  openOverlay: (mode: Exclude<MapOverlayMode, 'none'>) => void;
  openSearch: () => void;
  selectPlace: (place: PlaceSearchResult) => void;
  selection: SearchSelection | null;
  setFocusedMapSurface: (surface: FocusedMapSurface) => void;
  setLocationLoading: (isLoading: boolean) => void;
  toggleOverlay: (mode: Exclude<MapOverlayMode, 'none' | 'search'>) => void;
};

const MapOverlayContext = createContext<MapOverlayContextValue | null>(null);

export function MapOverlayProvider({ children }: PropsWithChildren) {
  const [activeOverlay, setActiveOverlay] = useState<MapOverlayMode>('none');
  const [focusedMapSurface, setFocusedMapSurface] =
    useState<FocusedMapSurface>('none');
  const [isLocationLoading, setLocationLoading] = useState(false);
  const [selection, setSelection] = useState<SearchSelection | null>(null);
  const selectionIdRef = useRef(0);

  const closeOverlay = useCallback(() => {
    setActiveOverlay('none');
  }, []);

  const openOverlay = useCallback(
    (mode: Exclude<MapOverlayMode, 'none'>) => {
      setActiveOverlay(mode);
    },
    [],
  );

  const toggleOverlay = useCallback(
    (mode: Exclude<MapOverlayMode, 'none' | 'search'>) => {
      setActiveOverlay((current) => (current === mode ? 'none' : mode));
    },
    [],
  );

  const openSearch = useCallback(() => {
    setActiveOverlay('search');
  }, []);

  const closeSearch = useCallback(() => {
    setActiveOverlay((current) => (current === 'search' ? 'none' : current));
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
    setFocusedMapSurface('search-results');
    setActiveOverlay('none');
  }, []);

  const value = useMemo(
    () => ({
      activeOverlay,
      closeOverlay,
      closeSearch,
      consumeSelection,
      focusedMapSurface,
      isLocationLoading,
      isSearchActive: activeOverlay === 'search',
      openOverlay,
      openSearch,
      selectPlace,
      selection,
      setFocusedMapSurface,
      setLocationLoading,
      toggleOverlay,
    }),
    [
      activeOverlay,
      closeOverlay,
      closeSearch,
      consumeSelection,
      focusedMapSurface,
      isLocationLoading,
      openOverlay,
      openSearch,
      selectPlace,
      selection,
      setLocationLoading,
      toggleOverlay,
    ],
  );

  return (
    <MapOverlayContext.Provider value={value}>
      {children}
    </MapOverlayContext.Provider>
  );
}

export function useMapOverlay() {
  const value = useContext(MapOverlayContext);

  if (!value) {
    throw new Error('useMapOverlay must be used within MapOverlayProvider');
  }

  return value;
}
