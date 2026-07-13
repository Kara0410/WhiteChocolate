import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Heart,
  MapPin,
  Search,
  UserRound,
  X,
  type LucideIcon,
} from 'lucide-react-native';
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
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

export type NavItemKey = 'search' | 'favorite' | 'profile';

type BottomNavBarProps = {
  activeKey?: NavItemKey;
  isSearchActive?: boolean;
  onSearchPress?: () => void;
  onSearchCancel?: () => void;
  onProfilePress?: () => void;
  onFavoritePress?: () => void;
};

type NavItem = {
  key: NavItemKey;
  label: string;
  icon: LucideIcon;
  onPress?: () => void;
};

const ACTIVE_COLOR = '#FFFFFF';
const INACTIVE_COLOR = 'rgba(255,255,255,0.52)';
const MORPH_DURATION = 320;
const SEARCH_BAR_HEIGHT = 56;
const NAVBAR_HEIGHT = 76;
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
      className="flex-row items-center border-t border-slate-100 px-4 py-4 active:bg-slate-50"
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
      {disabled ? <ActivityIndicator color="#2563EB" size="small" /> : null}
    </Pressable>
  );
});

const NavigationItem = memo(function NavigationItem({
  item,
  active,
}: {
  item: NavItem;
  active: boolean;
}) {
  const pressedScale = useSharedValue(1);
  const Icon = item.icon;
  const color = active ? ACTIVE_COLOR : INACTIVE_COLOR;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressedScale.value }],
  }));

  return (
    <Pressable
      accessibilityLabel={item.label}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      hitSlop={6}
      onPress={item.onPress}
      onPressIn={() => {
        pressedScale.value = withTiming(0.94, { duration: 90 });
      }}
      onPressOut={() => {
        pressedScale.value = withSpring(1, { damping: 14, stiffness: 260 });
      }}
      style={styles.navigationItem}
    >
      <Animated.View style={[styles.navigationItemContent, animatedStyle]}>
        <View
          style={[
            styles.navigationIcon,
            active ? styles.navigationIconActive : null,
          ]}
        >
          <Icon color={color} size={20} strokeWidth={active ? 2.4 : 2.05} />
        </View>
        <Text numberOfLines={1} style={[styles.navigationLabel, { color }]}>
          {item.label}
        </Text>
        <View
          style={[
            styles.activeDot,
            { opacity: active ? 1 : 0 },
          ]}
        />
      </Animated.View>
    </Pressable>
  );
});

function searchSuggestionKeyExtractor(item: PlaceSearchSuggestion) {
  return item.id;
}

export default function BottomNavBar({
  activeKey,
  isSearchActive = false,
  onSearchPress,
  onSearchCancel,
  onProfilePress,
  onFavoritePress,
}: BottomNavBarProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const inputRef = useRef<TextInput>(null);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const morphProgress = useSharedValue(isSearchActive ? 1 : 0);
  const { selectPlace } = useMapOverlay();
  const {
    beginSearchSession,
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
  const normalWidth = Math.min(windowWidth - 24, 420);
  const searchWidth = Math.min(windowWidth - 32, 420);
  const bottomOffset = Math.max(insets.bottom, 10) + 10;
  const normalTop = windowHeight - bottomOffset - NAVBAR_HEIGHT;
  const searchTop = insets.top + 12;
  const searchTranslateY = searchTop - normalTop;
  const suggestionMaxHeight = Math.max(
    120,
    Math.min(360, windowHeight - searchTop - SEARCH_BAR_HEIGHT - 28),
  );
  const items = useMemo<NavItem[]>(
    () => [
      { key: 'search', label: 'SEARCH', icon: Search, onPress: onSearchPress },
      {
        key: 'favorite',
        label: 'FAVORITES',
        icon: Heart,
        onPress: onFavoritePress,
      },
      {
        key: 'profile',
        label: 'YOU',
        icon: UserRound,
        onPress: onProfilePress,
      },
    ],
    [onFavoritePress, onProfilePress, onSearchPress],
  );

  useEffect(() => {
    if (focusTimerRef.current) {
      clearTimeout(focusTimerRef.current);
      focusTimerRef.current = null;
    }

    if (isSearchActive) {
      beginSearchSession();
      morphProgress.value = withTiming(1, {
        duration: MORPH_DURATION,
        easing: Easing.out(Easing.cubic),
      });
      focusTimerRef.current = setTimeout(() => {
        inputRef.current?.focus();
        focusTimerRef.current = null;
      }, 220);
      return;
    }

    Keyboard.dismiss();
    resetSearch();
    morphProgress.value = withTiming(0, {
      duration: MORPH_DURATION,
      easing: Easing.inOut(Easing.cubic),
    });
  }, [
    beginSearchSession,
    isSearchActive,
    morphProgress,
    resetSearch,
  ]);

  useEffect(
    () => () => {
      if (focusTimerRef.current) {
        clearTimeout(focusTimerRef.current);
      }
    },
    [],
  );

  const closeSearch = useCallback(() => {
    Keyboard.dismiss();
    inputRef.current?.blur();
    onSearchCancel?.();
  }, [onSearchCancel]);

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

  const wrapperStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          morphProgress.value,
          [0, 1],
          [0, searchTranslateY],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));
  const surfaceStyle = useAnimatedStyle(() => ({
    width: interpolate(
      morphProgress.value,
      [0, 1],
      [normalWidth, searchWidth],
      Extrapolation.CLAMP,
    ),
    height: interpolate(
      morphProgress.value,
      [0, 1],
      [NAVBAR_HEIGHT, SEARCH_BAR_HEIGHT],
      Extrapolation.CLAMP,
    ),
    borderRadius: interpolate(
      morphProgress.value,
      [0, 1],
      [32, SEARCH_BAR_HEIGHT / 2],
      Extrapolation.CLAMP,
    ),
    backgroundColor: interpolateColor(
      morphProgress.value,
      [0, 0.18, 1],
      ['rgba(18,18,20,0.92)', '#FFFFFF', '#FFFFFF'],
    ),
    borderColor: interpolateColor(
      morphProgress.value,
      [0, 0.24, 1],
      [
        'rgba(255,255,255,0.1)',
        'rgba(255,255,255,0.72)',
        'rgba(255,255,255,0.8)',
      ],
    ),
  }));
  const navStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      morphProgress.value,
      [0, 0.38],
      [1, 0],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        scale: interpolate(
          morphProgress.value,
          [0, 0.45],
          [1, 0.92],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));
  const searchContentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      morphProgress.value,
      [0.32, 0.76],
      [0, 1],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        translateY: interpolate(
          morphProgress.value,
          [0.32, 0.76],
          [7, 0],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      morphProgress.value,
      [0.35, 1],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));
  const suggestionsStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      morphProgress.value,
      [0.68, 1],
      [0, 1],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        translateY: interpolate(
          morphProgress.value,
          [0.68, 1],
          [-6, 0],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  return (
    <>
      <AnimatedPressable
        accessibilityLabel="Close search"
        onPress={closeSearch}
        pointerEvents={isSearchActive ? 'auto' : 'none'}
        style={[styles.searchBackdrop, backdropStyle]}
      />
      <Animated.View
        pointerEvents="box-none"
        style={[styles.wrapper, { bottom: bottomOffset }, wrapperStyle]}
      >
        <Animated.View style={[styles.morphSurface, surfaceStyle]}>
          <Animated.View
            pointerEvents={isSearchActive ? 'none' : 'auto'}
            style={[styles.normalContent, navStyle]}
          >
            <View style={styles.navigationGroup}>
              {items.map((item) => (
                <NavigationItem
                  active={activeKey === item.key}
                  item={item}
                  key={item.key}
                />
              ))}
            </View>
          </Animated.View>

          <Animated.View
            pointerEvents={isSearchActive ? 'auto' : 'none'}
            style={[styles.searchContent, searchContentStyle]}
          >
            <Pressable
              accessibilityLabel="Cancel search"
              accessibilityRole="button"
              className="h-10 w-10 items-center justify-center rounded-full active:bg-slate-100"
              hitSlop={8}
              onPress={closeSearch}
            >
              <ArrowLeft color="#475569" size={21} strokeWidth={2.4} />
            </Pressable>
            <TextInput
              ref={inputRef}
              autoCapitalize="none"
              autoCorrect={false}
              className="h-12 flex-1 px-2 text-[16px] font-semibold text-slate-950"
              clearButtonMode="never"
              onChangeText={setQuery}
              onFocus={() => {
                if (!isSearchActive) {
                  onSearchPress?.();
                }
              }}
              placeholder="Search place or address"
              placeholderTextColor="#94A3B8"
              returnKeyType="search"
              value={query}
            />
            {isLoading || isResolvingPlace ? (
              <View className="h-10 w-10 items-center justify-center">
                <ActivityIndicator color="#2563EB" size="small" />
              </View>
            ) : query.length > 0 ? (
              <Pressable
                accessibilityLabel="Clear search"
                accessibilityRole="button"
                className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 active:bg-slate-200"
                hitSlop={8}
                onPress={() => setQuery('')}
              >
                <X color="#475569" size={17} strokeWidth={2.5} />
              </Pressable>
            ) : (
              <Search color="#64748B" size={20} strokeWidth={2.3} />
            )}
          </Animated.View>
        </Animated.View>

        <Animated.View
          pointerEvents={isSearchActive ? 'auto' : 'none'}
          style={[
            styles.suggestionsCard,
            { maxHeight: suggestionMaxHeight, width: searchWidth },
            suggestionsStyle,
          ]}
        >
          <FlatList
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
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  searchBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.2)',
    elevation: MAP_ELEVATIONS.navBackdrop,
    zIndex: MAP_LAYERS.navBackdrop,
  },
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    elevation: MAP_ELEVATIONS.navBar,
    zIndex: MAP_LAYERS.navBar,
    height: NAVBAR_HEIGHT,
    alignItems: 'center',
  },
  morphSurface: {
    borderRadius: 32,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    boxShadow: '0 10px 24px rgba(0,0,0,0.24)',
    overflow: 'hidden',
  },
  normalContent: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
    paddingRight: 8,
  },
  searchContent: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  suggestionsCard: {
    position: 'absolute',
    top: SEARCH_BAR_HEIGHT + 8,
    overflow: 'hidden',
    borderRadius: 24,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.82)',
    backgroundColor: 'rgba(255,255,255,0.98)',
    boxShadow: '0 10px 24px rgba(15,23,42,0.14)',
  },
  navigationGroup: {
    flex: 1,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  navigationItem: {
    flex: 1,
    minWidth: 44,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navigationItemContent: {
    minWidth: 46,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  navigationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  navigationIconActive: {
    backgroundColor: 'rgba(59,130,246,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(147,197,253,0.22)',
  },
  navigationLabel: {
    fontSize: 8,
    lineHeight: 9,
    fontWeight: '800',
    letterSpacing: 0.45,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#60A5FA',
  },
});
