import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  type LayoutChangeEvent,
  Pressable,
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
import { BlurView } from 'expo-blur';
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
  getSearchNavbarLayout,
  SEARCH_INPUT_HEIGHT,
  SEARCH_NAVBAR_HEIGHT,
} from '@/utils/search-navbar-layout';
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
const INACTIVE_COLOR = 'rgba(255,255,255,0.64)';
const MORPH_DURATION = 320;
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
  const activeProgress = useSharedValue(active ? 1 : 0);
  const Icon = item.icon;
  const color = active ? ACTIVE_COLOR : INACTIVE_COLOR;

  useEffect(() => {
    activeProgress.value = withTiming(active ? 1 : 0, { duration: 180 });
  }, [active, activeProgress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressedScale.value }],
  }));
  const activeStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      activeProgress.value,
      [0, 1],
      ['rgba(255,255,255,0)', 'rgba(255,255,255,0.1)'],
    ),
    borderColor: interpolateColor(
      activeProgress.value,
      [0, 1],
      ['rgba(255,255,255,0)', 'rgba(255,255,255,0.13)'],
    ),
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
      className="h-full min-w-11 flex-1 items-center justify-center"
    >
      <Animated.View
        className="min-h-[54px] min-w-[72px] items-center justify-center gap-[3px] rounded-[24px] border border-transparent"
        style={[
          activeStyle,
          animatedStyle,
        ]}
      >
        <View className="h-[29px] w-[29px] items-center justify-center rounded-[15px]">
          <Icon color={color} size={19} strokeWidth={active ? 2.45 : 2.05} />
        </View>
        <Text
          className="text-[8.5px] font-extrabold leading-[10px] tracking-[0.35px]"
          numberOfLines={1}
          style={{ color }}
        >
          {item.label}
        </Text>
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
  const [overlayHeight, setOverlayHeight] = useState(windowHeight);
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
  const {
    normalTop,
    normalWidth,
    searchTop,
    searchWidth,
    suggestionMaxHeight,
  } = getSearchNavbarLayout({
    containerHeight: overlayHeight,
    insetBottom: insets.bottom,
    insetTop: insets.top,
    windowWidth,
  });
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

  const handleOverlayLayout = useCallback((event: LayoutChangeEvent) => {
    const nextHeight = event.nativeEvent.layout.height;

    setOverlayHeight((currentHeight) =>
      currentHeight === nextHeight ? currentHeight : nextHeight,
    );
  }, []);

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
          [0, searchTop - normalTop],
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
      [SEARCH_NAVBAR_HEIGHT, SEARCH_INPUT_HEIGHT],
      Extrapolation.CLAMP,
    ),
    borderRadius: interpolate(
      morphProgress.value,
      [0, 1],
      [32, SEARCH_INPUT_HEIGHT / 2],
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
  const surfaceShadeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      morphProgress.value,
      [0, 0.35],
      [1, 0],
      Extrapolation.CLAMP,
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
        className="absolute inset-0 z-20 bg-slate-900/20"
        onPress={closeSearch}
        pointerEvents={isSearchActive ? 'auto' : 'none'}
        style={[{ elevation: MAP_ELEVATIONS.navBackdrop, zIndex: MAP_LAYERS.navBackdrop }, backdropStyle]}
      />
      <View
        className="absolute inset-0"
        onLayout={handleOverlayLayout}
        pointerEvents="box-none"
        style={{ zIndex: MAP_LAYERS.navBar }}
      >
        <Animated.View
          className="absolute left-0 right-0 h-[84px] items-center"
          pointerEvents="box-none"
          style={[
            {
              elevation: MAP_ELEVATIONS.navBar,
              top: normalTop,
              zIndex: MAP_LAYERS.navBar,
            },
            wrapperStyle,
          ]}
        >
          <Animated.View
            className="overflow-hidden rounded-[30px] border border-white/10 shadow-nav"
            style={[{ borderCurve: 'continuous' }, surfaceStyle]}
          >
          <BlurView
            intensity={34}
            pointerEvents="none"
            className="absolute inset-0"
            tint="dark"
          />
          <Animated.View
            className="absolute inset-0 bg-slate-900/10"
            pointerEvents="none"
            style={surfaceShadeStyle}
          />
          <Animated.View
            className="absolute inset-0 flex-row items-center px-1.5"
            pointerEvents={isSearchActive ? 'none' : 'auto'}
            style={navStyle}
          >
            <View className="h-full flex-1 flex-row items-center">
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
            className="absolute inset-0 flex-row items-center px-2"
            pointerEvents={isSearchActive ? 'auto' : 'none'}
            style={searchContentStyle}
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
            className="absolute top-[56px] overflow-hidden rounded-[24px] border border-white/80 bg-white/98 shadow-overlay"
            pointerEvents={isSearchActive ? 'auto' : 'none'}
            style={[
              {
                borderCurve: 'continuous',
                maxHeight: suggestionMaxHeight,
                width: searchWidth,
              },
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
      </View>
    </>
  );
}
