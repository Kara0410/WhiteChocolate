/**
 * FilterChips — horizontal scrollable row of parking-type toggles.
 *
 * Each chip is colour-coded to match its badge in ParkingCard.
 * Active chips are filled; inactive chips show a coloured outline only.
 * Multiple chips can be active simultaneously (OR logic in the filter).
 */

import { Pressable, ScrollView, Text } from 'react-native';
import { FILTER_CHIPS } from '@/constants/parking';

type Props = {
  activeFilters: Set<string>;
  onToggle: (id: string) => void;
};

export default function FilterChips({ activeFilters, onToggle }: Props) {
  return (
    // minHeight prevents the strip from collapsing while ScrollView measures chip heights.
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="min-h-14 shrink-0 mb-1"
      contentContainerClassName="px-4 items-center gap-2.5"
    >
      {FILTER_CHIPS.map((chip) => {
        const active = activeFilters.has(chip.id);
        return (
          <Pressable
            key={chip.id}
            onPress={() => onToggle(chip.id)}
            // Active: solid fill using the chip colour.
            // Inactive: transparent fill with a coloured border.
            style={{
              borderColor: chip.color,
              backgroundColor: active ? chip.color : 'transparent',
            }}
            className="px-[18px] py-[11px] rounded-[24px] border-2"
          >
            <Text
              style={{ color: active ? '#1a1f24' : chip.color }}
              className="text-sm font-bold tracking-[0.2px]"
            >
              {chip.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
