export const MAP_LAYERS = {
  map: 0,
  markers: 10,
  markerHighlights: 20,
  floatingControls: 40,
  bottomSheetHost: 100,
  // Keep the existing sheet-body styles unchanged.
  bottomSheet: 100,
  navBackdrop: 190,
  navBar: 200,
} as const;

export const MAP_ELEVATIONS = {
  map: 0,
  markers: 2,
  markerHighlights: 4,
  floatingControls: 6,
  bottomSheetHost: 12,
  // Keep the existing sheet-body styles unchanged.
  bottomSheet: 12,
  navBackdrop: 18,
  navBar: 20,
} as const;
