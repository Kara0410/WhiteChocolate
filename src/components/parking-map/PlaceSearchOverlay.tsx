import { memo, useCallback, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MapPin, Search, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  type PlaceSearchResult,
  usePlaceSearch,
} from '@/hooks/use-place-search';

type PlaceSearchOverlayProps = {
  visible: boolean;
  onClose: () => void;
  onSelectPlace: (result: PlaceSearchResult) => void;
};

const SearchResultRow = memo(function SearchResultRow({
  item,
  onPress,
}: {
  item: PlaceSearchResult;
  onPress: (item: PlaceSearchResult) => void;
}) {
  return (
    <Pressable
      accessibilityLabel={`Search for ${item.title}`}
      accessibilityRole="button"
      className="flex-row items-center border-t border-slate-100 px-4 py-4 active:bg-slate-50"
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
          {item.title}
        </Text>
        {item.subtitle ? (
          <Text
            className="mt-1 text-[12px] font-semibold text-slate-500"
            numberOfLines={1}
          >
            {item.subtitle}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
});

export function PlaceSearchOverlay({
  visible,
  onClose,
  onSelectPlace,
}: PlaceSearchOverlayProps) {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const {
    clear,
    error,
    hasSearched,
    isLoading,
    query,
    results,
    setQuery,
  } = usePlaceSearch();

  useEffect(() => {
    if (!visible) {
      clear();
      return;
    }

    const focusTimer = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(focusTimer);
  }, [clear, visible]);

  const closeSearch = useCallback(() => {
    Keyboard.dismiss();
    onClose();
  }, [onClose]);

  const handleSelectPlace = useCallback(
    (result: PlaceSearchResult) => {
      Keyboard.dismiss();
      onSelectPlace(result);
    },
    [onSelectPlace],
  );

  if (!visible) {
    return null;
  }

  return (
    <View
      className="absolute inset-0 z-30 bg-slate-950/20"
      pointerEvents="box-none"
    >
      <Pressable
        accessibilityLabel="Close search"
        className="absolute inset-0"
        onPress={closeSearch}
      />

      <View
        className="mx-4 overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-lg"
        style={{
          marginTop: insets.top + 12,
          borderCurve: 'continuous',
          boxShadow: '0 16px 38px rgba(15,23,42,0.18)',
          elevation: 10,
        }}
      >
        <View className="flex-row items-center px-4 py-3">
          <Search color="#64748B" size={20} strokeWidth={2.4} />
          <TextInput
            ref={inputRef}
            autoCapitalize="none"
            autoCorrect={false}
            className="ml-3 h-11 flex-1 text-[16px] font-semibold text-slate-950"
            clearButtonMode="while-editing"
            onChangeText={setQuery}
            placeholder="Search place or address"
            placeholderTextColor="#94A3B8"
            returnKeyType="search"
            value={query}
          />
          <Pressable
            accessibilityLabel="Close search"
            accessibilityRole="button"
            className="ml-2 h-9 w-9 items-center justify-center rounded-full bg-slate-100 active:bg-slate-200"
            hitSlop={8}
            onPress={closeSearch}
          >
            <X color="#475569" size={18} strokeWidth={2.5} />
          </Pressable>
        </View>

        <FlatList
          data={results}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <View className="border-t border-slate-100 px-4 py-6">
              {isLoading ? (
                <View className="flex-row items-center">
                  <ActivityIndicator color="#2563EB" />
                  <Text className="ml-3 text-[14px] font-semibold text-slate-500">
                    Searching places...
                  </Text>
                </View>
              ) : error ? (
                <Text className="text-[14px] font-semibold text-red-600">
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
          renderItem={({ item }) => (
            <SearchResultRow item={item} onPress={handleSelectPlace} />
          )}
          style={{ maxHeight: 360 }}
        />
      </View>
    </View>
  );
}
