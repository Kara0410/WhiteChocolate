import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type KeyboardEvent,
} from 'react-native';
import { ArrowLeft, MapPin, X } from 'lucide-react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutUp,
  ReduceMotion,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FigmaSearchIcon } from '@/components/ui/figma-icons';
import { GlassSurface } from '@/components/ui/glass-surface';
import {
  MAP_ELEVATIONS,
  MAP_LAYERS,
} from '@/components/parking-map/map-layers';
import { useMapOverlay } from '@/context/MapOverlayContext';
import {
  type PlaceSearchSuggestion,
  useGooglePlaceSearch,
} from '@/hooks/use-google-place-search';
import {
  getMapSearchLayout,
  MAP_SEARCH_BAR_HEIGHT,
} from '@/utils/map-search-layout';
import { COLORS, HOME_LAYOUT } from '@/constants/theme';

const SEARCH_BACKDROP_ENTERING = FadeIn.duration(140).reduceMotion(
  ReduceMotion.System,
);
const SEARCH_BACKDROP_EXITING = FadeOut.duration(120).reduceMotion(
  ReduceMotion.System,
);
const SEARCH_RESULTS_ENTERING = FadeInDown.duration(180).reduceMotion(
  ReduceMotion.System,
);
const SEARCH_RESULTS_EXITING = FadeOutUp.duration(120).reduceMotion(
  ReduceMotion.System,
);

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SearchResultRow = memo(function SearchResultRow({
  disabled,
  item,
  onPress,
}: {
  disabled: boolean;
  item: PlaceSearchSuggestion;
  onPress: (item: PlaceSearchSuggestion) => void;
}) {
  return (
    <Pressable
      accessibilityLabel={`Search for ${item.primaryText}`}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      className="min-h-16 flex-row items-center border-t border-border-subtle px-4 py-3 active:bg-surface-input"
      disabled={disabled}
      onPress={() => onPress(item)}
    >
      <View className="h-10 w-10 items-center justify-center rounded-full bg-accent-soft">
        <MapPin color={COLORS.accent.primary} size={18} strokeWidth={2.3} />
      </View>
      <View className="ml-3 flex-1">
        <Text
          className="text-body-strong text-ink-primary"
          numberOfLines={1}
        >
          {item.primaryText}
        </Text>
        {item.secondaryText ? (
          <Text
            className="mt-1 text-caption text-ink-secondary"
            numberOfLines={1}
          >
            {item.secondaryText}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
});

function searchSuggestionKeyExtractor(item: PlaceSearchSuggestion) {
  return item.id;
}

export function MapSearchBar() {
  const insets = useSafeAreaInsets();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const inputRef = useRef<TextInput>(null);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [keyboardTop, setKeyboardTop] = useState<number | null>(null);
  const {
    activeOverlay,
    closeSearch,
    isSearchActive,
    openSearch,
    selectPlace,
  } = useMapOverlay();
  const {
    beginSearchSession,
    clearQuery,
    error,
    hasSearched,
    isLoading,
    isResolvingPlace,
    query,
    resetSearch,
    results,
    selectSuggestion,
    setQuery,
  } = useGooglePlaceSearch();

  useEffect(() => {
    const updateKeyboardTop = (event: KeyboardEvent) => {
      setKeyboardTop(event.endCoordinates.screenY);
    };
    const showSubscription = Keyboard.addListener(
      'keyboardDidShow',
      updateKeyboardTop,
    );
    const frameSubscription = Keyboard.addListener(
      'keyboardWillChangeFrame',
      updateKeyboardTop,
    );
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardTop(null);
    });

    return () => {
      showSubscription.remove();
      frameSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (focusTimerRef.current) {
      clearTimeout(focusTimerRef.current);
      focusTimerRef.current = null;
    }

    if (isSearchActive) {
      beginSearchSession();
      focusTimerRef.current = setTimeout(() => {
        inputRef.current?.focus();
        focusTimerRef.current = null;
      }, 80);
      return;
    }

    Keyboard.dismiss();
    setKeyboardTop(null);
    resetSearch();
  }, [beginSearchSession, isSearchActive, resetSearch]);

  useEffect(
    () => () => {
      if (focusTimerRef.current) {
        clearTimeout(focusTimerRef.current);
      }
    },
    [],
  );

  const handleCloseSearch = useCallback(() => {
    Keyboard.dismiss();
    inputRef.current?.blur();
    closeSearch();
  }, [closeSearch]);

  const handleClearQuery = useCallback(() => {
    clearQuery();
    inputRef.current?.focus();
  }, [clearQuery]);

  const handleSelectPlace = useCallback(
    async (suggestion: PlaceSearchSuggestion) => {
      Keyboard.dismiss();
      const place = await selectSuggestion(suggestion);

      if (place) {
        selectPlace(place);
      }
    },
    [selectPlace, selectSuggestion],
  );

  const renderSearchResult = useCallback(
    ({ item }: { item: PlaceSearchSuggestion }) => (
      <SearchResultRow
        disabled={isResolvingPlace}
        item={item}
        onPress={handleSelectPlace}
      />
    ),
    [handleSelectPlace, isResolvingPlace],
  );

  const viewportBottom = Math.min(
    windowHeight,
    keyboardTop ?? windowHeight,
  );
  const { resultsTop, searchTop, suggestionMaxHeight } = getMapSearchLayout({
    insetTop: insets.top,
    viewportBottom,
  });
  const isVisible = activeOverlay === 'none' || isSearchActive;
  const horizontalInset =
    windowWidth < 360 ? 16 : HOME_LAYOUT.horizontalInset;

  if (!isVisible) {
    return null;
  }

  return (
    <>
      {isSearchActive ? (
        <AnimatedPressable
          accessibilityLabel="Close search"
          accessibilityRole="button"
          className="absolute inset-0 bg-ink-primary/10"
          entering={SEARCH_BACKDROP_ENTERING}
          exiting={SEARCH_BACKDROP_EXITING}
          onPress={handleCloseSearch}
          style={{
            elevation: MAP_ELEVATIONS.mapSearchBackdrop,
            zIndex: MAP_LAYERS.mapSearchBackdrop,
          }}
        />
      ) : null}

      <View
        className="absolute"
        pointerEvents="box-none"
        style={{
          elevation: MAP_ELEVATIONS.mapSearch,
          left: horizontalInset,
          right: horizontalInset,
          top: searchTop,
          zIndex: MAP_LAYERS.mapSearch,
        }}
      >
        <GlassSurface
          style={{ height: MAP_SEARCH_BAR_HEIGHT }}
          variant="search"
        >
          {isSearchActive ? (
            <View className="h-full flex-row items-center px-2">
              <Pressable
                accessibilityLabel="Close search"
                accessibilityRole="button"
                className="h-11 w-11 items-center justify-center rounded-full active:bg-surface-muted"
                hitSlop={4}
                onPress={handleCloseSearch}
              >
                <ArrowLeft color={COLORS.icon.default} size={21} strokeWidth={2.4} />
              </Pressable>
              <TextInput
                ref={inputRef}
                accessibilityLabel="Search place or address"
                autoCapitalize="none"
                autoCorrect={false}
                className="h-full flex-1 px-1 text-[16px] font-semibold text-ink-primary"
                clearButtonMode="never"
                onChangeText={setQuery}
                placeholder="Search here"
                placeholderTextColor={COLORS.text.placeholder}
                returnKeyType="search"
                value={query}
              />
              {isLoading || isResolvingPlace ? (
                <View className="h-11 w-11 items-center justify-center">
                  <ActivityIndicator color={COLORS.accent.primary} size="small" />
                </View>
              ) : query.length > 0 ? (
                <Pressable
                  accessibilityLabel="Clear search"
                  accessibilityRole="button"
                  className="h-11 w-11 items-center justify-center rounded-full active:bg-surface-muted"
                  hitSlop={4}
                  onPress={handleClearQuery}
                >
                  <X color={COLORS.icon.default} size={18} strokeWidth={2.5} />
                </Pressable>
              ) : (
                <View className="h-11 w-11 items-center justify-center">
                  <FigmaSearchIcon color={COLORS.accent.primary} size={20} />
                </View>
              )}
            </View>
          ) : (
            <Pressable
              accessibilityLabel="Search"
              accessibilityRole="button"
              className="h-full flex-row items-center px-[14px] active:bg-surface-glass-readable"
              onPress={openSearch}
            >
              <FigmaSearchIcon color={COLORS.accent.primary} size={20} />
              <Text className="ml-3 flex-1 text-[16px] font-normal text-ink-placeholder">
                Search here
              </Text>
            </Pressable>
          )}
        </GlassSurface>
      </View>

      {isSearchActive ? (
        <Animated.View
          className="absolute overflow-hidden rounded-card border border-border-glass bg-surface-glass-readable shadow-overlay"
          entering={SEARCH_RESULTS_ENTERING}
          exiting={SEARCH_RESULTS_EXITING}
          style={{
            borderCurve: 'continuous',
            elevation: MAP_ELEVATIONS.mapSearch,
            left: horizontalInset,
            maxHeight: suggestionMaxHeight,
            right: horizontalInset,
            top: resultsTop,
            zIndex: MAP_LAYERS.mapSearch,
          }}
        >
          <FlatList
            contentInsetAdjustmentBehavior="never"
            data={results}
            initialNumToRender={6}
            keyboardShouldPersistTaps="handled"
            keyExtractor={searchSuggestionKeyExtractor}
            ListEmptyComponent={
              <View className="border-t border-border-subtle px-4 py-6">
                {isLoading ? (
                  <View className="flex-row items-center">
                    <ActivityIndicator color={COLORS.accent.primary} />
                    <Text className="ml-3 text-[14px] font-semibold text-ink-secondary">
                      Searching Google Places...
                    </Text>
                  </View>
                ) : isResolvingPlace ? (
                  <View className="flex-row items-center">
                    <ActivityIndicator color={COLORS.accent.primary} />
                    <Text className="ml-3 text-[14px] font-semibold text-ink-secondary">
                      Loading place...
                    </Text>
                  </View>
                ) : error ? (
                  <Text
                    accessibilityRole="alert"
                    className="text-[14px] font-semibold text-feedback-error"
                    selectable
                  >
                    {error}
                  </Text>
                ) : hasSearched ? (
                  <Text className="text-[14px] font-semibold text-ink-secondary">
                    No places found
                  </Text>
                ) : (
                  <Text className="text-[14px] font-semibold text-ink-secondary">
                    Try an address, landmark, or business name.
                  </Text>
                )}
              </View>
            }
            maxToRenderPerBatch={6}
            renderItem={renderSearchResult}
            showsVerticalScrollIndicator={false}
            updateCellsBatchingPeriod={50}
            windowSize={5}
          />
        </Animated.View>
      ) : null}
    </>
  );
}
