export const SEARCH_NAVBAR_HEIGHT = 66;
export const SEARCH_INPUT_HEIGHT = 54;

type SearchNavbarLayoutInput = {
  containerHeight: number;
  windowWidth: number;
  insetTop: number;
  insetBottom: number;
};

export function getSearchNavbarLayout({
  containerHeight,
  windowWidth,
  insetTop,
  insetBottom,
}: SearchNavbarLayoutInput) {
  const bottomOffset = Math.max(insetBottom, 8) + 12;
  const searchTop = insetTop + 12;
  const normalTop = Math.max(
    searchTop,
    containerHeight - bottomOffset - SEARCH_NAVBAR_HEIGHT,
  );
  const availableSuggestionHeight =
    containerHeight - searchTop - SEARCH_INPUT_HEIGHT - 28;

  return {
    bottomOffset,
    normalTop,
    normalWidth: Math.max(0, Math.min(windowWidth - 48, 336)),
    searchTop,
    searchWidth: Math.max(0, Math.min(windowWidth - 32, 420)),
    suggestionMaxHeight: Math.max(
      0,
      Math.min(360, availableSuggestionHeight),
    ),
  };
}
