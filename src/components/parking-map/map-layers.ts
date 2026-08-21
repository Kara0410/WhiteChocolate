export const MAP_LAYERS = {
  map: 0,
  markers: 10,
  markerHighlights: 20,
  floatingControls: 40,
  bottomSheetHost: 100,
  // Keep the existing sheet-body styles unchanged.
  bottomSheet: 100,
  navBar: 200,
  mapSearchBackdrop: 210,
  mapSearch: 220,
} as const;

export const MAP_ELEVATIONS = {
  map: 0,
  markers: 2,
  markerHighlights: 4,
  floatingControls: 6,
  bottomSheetHost: 12,
  // Keep the existing sheet-body styles unchanged.
  bottomSheet: 12,
  navBar: 20,
  mapSearchBackdrop: 22,
  mapSearch: 24,
} as const;
