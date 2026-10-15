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
  /** Mirrors ParkingMap's local `selectedSearchPlace` so the search header can show the
   * live destination title without owning search state itself. */
  focusedSearchPlace: PlaceSearchResult | null;
  setFocusedSearchPlace: (place: PlaceSearchResult | null) => void;
  /** One-shot counter: bump to ask ParkingMap to dismiss whatever focused surface (search
   * results or a parking detail) is currently open. Consumed by an effect in ParkingMap. */
  dismissFocusedSurfaceRequestId: number;
  requestDismissFocusedSurface: () => void;
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
  const [focusedSearchPlace, setFocusedSearchPlace] =
    useState<PlaceSearchResult | null>(null);
  const [dismissFocusedSurfaceRequestId, setDismissFocusedSurfaceRequestId] =
    useState(0);

  const requestDismissFocusedSurface = useCallback(() => {
    setDismissFocusedSurfaceRequestId((current) => current + 1);
  }, []);

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
      dismissFocusedSurfaceRequestId,
      focusedMapSurface,
      focusedSearchPlace,
      isLocationLoading,
      isSearchActive: activeOverlay === 'search',
      openOverlay,
      openSearch,
      requestDismissFocusedSurface,
      selectPlace,
      selection,
      setFocusedMapSurface,
      setFocusedSearchPlace,
      setLocationLoading,
      toggleOverlay,
    }),
    [
      activeOverlay,
      closeOverlay,
      closeSearch,
      consumeSelection,
      dismissFocusedSurfaceRequestId,
      focusedMapSurface,
      focusedSearchPlace,
      isLocationLoading,
      openOverlay,
      openSearch,
      requestDismissFocusedSurface,
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
