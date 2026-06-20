/**
 * ParkingCard — a single row in the parking list.
 *
 * Height is fixed via inline style (tied to CARD_H / CARD_H_DIST constants) so
 * FlatList's getItemLayout can skip dynamic measurement across all 1 700+ rows.
 * Everything else is expressed as Tailwind className.
 */

import { memo, useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getBadgeColor, type DisplayEntry } from '@/utils/parking';
import { fmtDist } from '@/utils/geo';
import { CARD_H, CARD_H_DIST, ITEM_MARGIN } from '@/constants/parking';

type Props = {
  item: DisplayEntry;
  /** True when location mode is active — shows the distance row and uses the taller card height. */
  showDist: boolean;
};

function ParkingCard({ item, showDist }: Props) {
  const badgeColor = getBadgeColor(item.gruppe);
  // Dark-background badges (red, grey) need white text; light ones use near-black.
  const badgeTextColor =
    badgeColor === '#6b7280' || badgeColor === '#f87171' ? '#fff' : '#1a1f24';

  const onPress = useCallback(
    () => router.push({ pathname: '/parking/[id]', params: { id: String(item._idx) } }),
    [item._idx],
  );

  return (
    <Pressable
      // Height and margin stay as inline style — they drive getItemLayout math
      // and must stay numerically in sync with the CARD_H constants.
      style={({ pressed }) => ({
        height:        showDist ? CARD_H_DIST : CARD_H,
        marginBottom:  ITEM_MARGIN,
        opacity:       pressed ? 0.75 : 1,
        elevation:     3, // Android drop shadow
      })}
      className="bg-elevated rounded-[14px] px-3.5 justify-between shadow-sm"
      onPress={onPress}
    >
      {/* Row 1 — street name + space count */}
      <View className="flex-row items-center gap-2 pt-3.5">
        <Text className="text-white text-[17px] font-semibold flex-1" numberOfLines={1}>
          {item.strasse}
        </Text>
        {item.angebot > 0 && (
          <Text className="text-gold text-xs font-semibold">{item.angebot} sp</Text>
        )}
      </View>

      {/* Row 2 — colour-coded type badge + district name */}
      <View className="flex-row items-center gap-2">
        <View
          className="rounded-full px-2.5 py-0.5 max-w-[165px]"
          style={{ backgroundColor: badgeColor }}
        >
          <Text
            className="text-[11px] font-semibold"
            style={{ color: badgeTextColor }}
            numberOfLines={1}
          >
            {item.gruppe}
          </Text>
        </View>
        {item.prm !== '' && (
          <Text className="text-gray-400 text-xs flex-1" numberOfLines={1}>
            {item.prm}
          </Text>
        )}
      </View>

      {/* Row 3 — full rule description, truncated to one line */}
      <Text className="text-gray-500 text-xs" numberOfLines={1}>
        {item.beschreibung}
      </Text>

      {/* Row 4 — distance from user (location mode only) */}
      {showDist && item.distance !== undefined && (
        <View className="flex-row items-center gap-1 pb-3.5">
          <Ionicons name="navigate" size={12} color="#ffd33d" />
          <Text className="text-gold text-xs font-semibold">
            {fmtDist(item.distance)} away
          </Text>
        </View>
      )}

      {/* Chevron hints the card is tappable */}
      <Ionicons
        name="chevron-forward"
        size={15}
        color="#374151"
        style={{ position: 'absolute', right: 12, bottom: 12 }}
      />
    </Pressable>
  );
}

// Rows are rendered in a long FlatList; memoizing prevents every visible card
// from re-rendering when the parent re-renders (e.g. on each search keystroke).
// item identity is stable (the cached _idx-stamped objects), so a shallow
// prop compare is correct here.
export default memo(ParkingCard);
