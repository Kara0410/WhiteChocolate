import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ListRenderItem,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { parkingData } from '@/data/munich_parking';
import { filterAndSort, type DisplayEntry } from '@/utils/parking';
import { useLocation } from '@/hooks/useLocation';
import { ITEM_H, ITEM_H_DIST } from '@/constants/parking';
import ParkingCard from '@/components/ParkingCard';
import FilterChips from '@/components/FilterChips';

const keyExtractor = (item: DisplayEntry) => item.strasse;

export default function ParkingListScreen() {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState(new Set<string>());

  const { userLoc, locLoading, requestLocation } = useLocation();

  const showDist = userLoc !== null;
  const itemH = showDist ? ITEM_H_DIST : ITEM_H;

  const toggleFilter = useCallback((id: string) => {
    setFilters((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const displayed = useMemo(
    () => filterAndSort(parkingData, query, filters, userLoc),
    [query, filters, userLoc],
  );

  const getItemLayout = useCallback(
    (_: ArrayLike<DisplayEntry> | null | undefined, index: number) => ({
      length: itemH,
      offset: itemH * index,
      index,
    }),
    [itemH],
  );

  const renderItem: ListRenderItem<DisplayEntry> = useCallback(
    ({ item }) => <ParkingCard item={item} showDist={showDist} />,
    [showDist],
  );

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View className="px-5 pt-4 pb-2.5">
        <Text className="text-[26px] font-bold text-white tracking-[0.3px]">
          Munich Parking
        </Text>
        <Text className="text-[13px] text-gray-500 mt-[3px]">
          {showDist ? 'Nearest first' : 'A–Z'} · {displayed.length} of {parkingData.length} streets
        </Text>
      </View>

      {/* ── Search bar + location toggle ────────────────────────────────── */}
      <View className="flex-row items-center mx-4 mb-2.5 bg-sunken rounded-xl border border-gray-700 pl-3 h-[46px]">
        <Ionicons name="search" size={17} color="#6b7280" style={{ marginRight: 8 }} />
        <TextInput
          className="flex-1 text-white text-[15px] h-full"
          placeholder="Street, district or type…"
          placeholderTextColor="#4b5563"
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        {Platform.OS !== 'ios' && query.length > 0 && (
          <Pressable onPress={() => setQuery('')} className="p-1.5">
            <Ionicons name="close-circle" size={18} color="#6b7280" />
          </Pressable>
        )}
        <View className="w-px h-[22px] bg-gray-700 mx-1" />
        <Pressable onPress={requestLocation} className="px-3 h-full justify-center" disabled={locLoading}>
          {locLoading ? (
            <ActivityIndicator size="small" color="#ffd33d" />
          ) : (
            <Ionicons
              name={showDist ? 'navigate' : 'navigate-outline'}
              size={20}
              color={showDist ? '#ffd33d' : '#6b7280'}
            />
          )}
        </Pressable>
      </View>

      {/* ── Type-filter chips ───────────────────────────────────────────── */}
      <FilterChips activeFilters={filters} onToggle={toggleFilter} />

      {/* ── Parking list ────────────────────────────────────────────────── */}
      <FlatList
        key={showDist ? 'dist' : 'alpha'}
        data={displayed}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        contentContainerClassName="px-4 pb-24"
        showsVerticalScrollIndicator={false}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListEmptyComponent={
          <View className="items-center mt-20 gap-3">
            <Ionicons name="search-outline" size={40} color="#374151" />
            <Text className="text-gray-600 text-base">No results found</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
