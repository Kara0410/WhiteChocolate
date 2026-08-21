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
import { ArrowLeft, MapPin, Search, X } from 'lucide-react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutUp,
  ReduceMotion,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
      className="min-h-16 flex-row items-center border-t border-slate-100 px-4 py-3 active:bg-slate-50"
      disabled={disabled}
      onPress={() => onPress(item)}
    >
      <View className="h-10 w-10 items-center justify-center rounded-full bg-blue-50">
        <MapPin color="#2563EB" size={18} strokeWidth={2.3} />
      </View>
      <View className="ml-3 flex-1">
        <Text
          className="text-[15px] font-extrabold text-slate-950"
          numberOfLines={1}
        >
          {item.primaryText}
        </Text>
        {item.secondaryText ? (
          <Text
            className="mt-1 text-[12px] font-semibold text-slate-500"
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
  const { height: windowHeight } = useWindowDimensions();
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

  if (!isVisible) {
    return null;
  }

  return (
    <>
      {isSearchActive ? (
        <AnimatedPressable
          accessibilityLabel="Close search"
          accessibilityRole="button"
          className="absolute inset-0 bg-slate-950/10"
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
        className="absolute left-4 right-4"
        pointerEvents="box-none"
        style={{
          elevation: MAP_ELEVATIONS.mapSearch,
          top: searchTop,
          zIndex: MAP_LAYERS.mapSearch,
        }}
      >
        <View
          className="overflow-hidden rounded-[28px] border border-white/80 bg-white/95 shadow-overlay"
          style={{
            borderCurve: 'continuous',
            height: MAP_SEARCH_BAR_HEIGHT,
          }}
        >
          {isSearchActive ? (
            <View className="h-full flex-row items-center px-2">
              <Pressable
                accessibilityLabel="Close search"
                accessibilityRole="button"
                className="h-11 w-11 items-center justify-center rounded-full active:bg-slate-100"
                hitSlop={4}
                onPress={handleCloseSearch}
              >
                <ArrowLeft color="#475569" size={21} strokeWidth={2.4} />
              </Pressable>
              <TextInput
                ref={inputRef}
                accessibilityLabel="Search place or address"
                autoCapitalize="none"
                autoCorrect={false}
                className="h-full flex-1 px-1 text-[16px] font-semibold text-slate-950"
                clearButtonMode="never"
                onChangeText={setQuery}
                placeholder="Search place or address"
                placeholderTextColor="#94A3B8"
                returnKeyType="search"
                value={query}
              />
              {isLoading || isResolvingPlace ? (
                <View className="h-11 w-11 items-center justify-center">
                  <ActivityIndicator color="#2563EB" size="small" />
                </View>
              ) : query.length > 0 ? (
                <Pressable
                  accessibilityLabel="Clear search"
                  accessibilityRole="button"
                  className="h-11 w-11 items-center justify-center rounded-full active:bg-slate-100"
                  hitSlop={4}
                  onPress={handleClearQuery}
                >
                  <X color="#475569" size={18} strokeWidth={2.5} />
                </Pressable>
              ) : (
                <View className="h-11 w-11 items-center justify-center">
                  <Search color="#64748B" size={20} strokeWidth={2.3} />
                </View>
              )}
            </View>
          ) : (
            <Pressable
              accessibilityLabel="Search place or address"
              accessibilityRole="button"
              className="h-full flex-row items-center px-4 active:bg-slate-50"
              onPress={openSearch}
            >
              <Search color="#475569" size={21} strokeWidth={2.35} />
              <Text className="ml-3 flex-1 text-[16px] font-semibold text-slate-600">
                Search place or address
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {isSearchActive ? (
        <Animated.View
          className="absolute left-4 right-4 overflow-hidden rounded-[24px] border border-white/80 bg-white/95 shadow-overlay"
          entering={SEARCH_RESULTS_ENTERING}
          exiting={SEARCH_RESULTS_EXITING}
          style={{
            borderCurve: 'continuous',
            elevation: MAP_ELEVATIONS.mapSearch,
            maxHeight: suggestionMaxHeight,
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
              <View className="border-t border-slate-100 px-4 py-6">
                {isLoading ? (
                  <View className="flex-row items-center">
                    <ActivityIndicator color="#2563EB" />
                    <Text className="ml-3 text-[14px] font-semibold text-slate-500">
                      Searching Google Places...
                    </Text>
                  </View>
                ) : isResolvingPlace ? (
                  <View className="flex-row items-center">
                    <ActivityIndicator color="#2563EB" />
                    <Text className="ml-3 text-[14px] font-semibold text-slate-500">
                      Loading place...
                    </Text>
                  </View>
                ) : error ? (
                  <Text
                    accessibilityRole="alert"
                    className="text-[14px] font-semibold text-red-600"
                    selectable
                  >
                    {error}
                  </Text>
                ) : hasSearched ? (
                  <Text className="text-[14px] font-semibold text-slate-500">
                    No places found
                  </Text>
                ) : (
                  <Text className="text-[14px] font-semibold text-slate-500">
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
