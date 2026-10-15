export const MAP_SEARCH_BAR_HEIGHT = 47;
export const MAP_SEARCH_TOP_GAP = 32;
export const MAP_SEARCH_RESULTS_GAP = 6;
export const MAP_SEARCH_CONTROL_GAP = 12;

type MapSearchLayoutInput = {
  insetTop: number;
  viewportBottom: number;
};

export function getMapSearchLayout({
  insetTop,
  viewportBottom,
}: MapSearchLayoutInput) {
  const searchTop = insetTop + MAP_SEARCH_TOP_GAP;
  const resultsTop =
    searchTop + MAP_SEARCH_BAR_HEIGHT + MAP_SEARCH_RESULTS_GAP;
  const availableResultsHeight = viewportBottom - resultsTop - 12;

  return {
    resultsTop,
    searchTop,
    suggestionMaxHeight: Math.max(
      0,
      Math.min(360, availableResultsHeight),
    ),
  };
}

export function getMapSearchControlTop(insetTop: number) {
  return (
    insetTop +
    MAP_SEARCH_TOP_GAP +
    MAP_SEARCH_BAR_HEIGHT +
    MAP_SEARCH_CONTROL_GAP
  );
}
