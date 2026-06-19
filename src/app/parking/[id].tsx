/**
 * Parking detail screen — full info for one entry plus an inline map.
 *
 * Route param: id — numeric index into parkingData[].
 * Passed by ParkingCard when the user taps a list row.
 */

import { Linking, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { parkingData } from '@/data/munich_parking';
import { getBadgeColor } from '@/utils/parking';
import InfoRow from '@/components/InfoRow';
// react-native-maps is native-only. Loaded via require() so Metro can
// dead-code-eliminate it when building the web bundle.
let MapView: any = null;
let Marker: any  = null;
if (Platform.OS !== 'web') {
  const maps = require('react-native-maps');
  MapView = maps.default;
  Marker  = maps.Marker;
}

export default function ParkingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = parkingData[parseInt(id ?? '0', 10)];

  if (!item) {
    return <Text className="text-white text-center mt-10 text-base">Entry not found.</Text>;
  }

  const badgeColor = getBadgeColor(item.gruppe);
  const darkBadge  = badgeColor === '#6b7280' || badgeColor === '#f87171';
  const hasCoords  = item.lat !== null && item.lon !== null;

  const openOSM = () =>
    Linking.openURL(
      `https://www.openstreetmap.org/?mlat=${item.lat}&mlon=${item.lon}&zoom=17`,
    );

  return (
    <>
      {/* Override the Stack header with the street name as title */}
      <Stack.Screen
        options={{
          title: item.strasse,
          headerStyle: { backgroundColor: '#25292e' },
          headerTintColor: '#fff',
          headerShadowVisible: false,
        }}
      />

      <ScrollView className="flex-1 bg-surface" contentContainerClassName="pb-10">

        {/* ── Map area ──────────────────────────────────────────────────── */}
        <View className="h-[260px] bg-sunken">
          {Platform.OS !== 'web' && hasCoords && MapView ? (
            // Native: inline map centred on the spot; scroll + zoom disabled
            // so the detail card below is still reachable by swiping.
            <MapView
              style={{ flex: 1 }}
              initialRegion={{
                latitude:       item.lat!,
                longitude:      item.lon!,
                latitudeDelta:  0.005, // ~500 m viewport
                longitudeDelta: 0.005,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
            >
              <Marker
                coordinate={{ latitude: item.lat!, longitude: item.lon! }}
                title={item.strasse}
                description={item.gruppe}
                pinColor="#ffd33d"
              />
            </MapView>
          ) : (
            // Web / no-coords: tappable tile that opens OSM in the browser.
            <Pressable
              className="flex-1 items-center justify-center gap-2.5"
              onPress={hasCoords ? openOSM : undefined}
            >
              <Ionicons
                name="map-outline"
                size={40}
                color={hasCoords ? '#ffd33d' : '#374151'}
              />
              <Text className={hasCoords ? 'text-gold text-[15px] font-semibold' : 'text-gray-600 text-[15px]'}>
                {hasCoords ? 'Open in OpenStreetMap' : 'No location data'}
              </Text>
              {hasCoords && (
                <Text className="text-gray-500 text-xs">
                  {item.lat?.toFixed(5)}, {item.lon?.toFixed(5)}
                </Text>
              )}
            </Pressable>
          )}
        </View>

        {/* ── Detail card ───────────────────────────────────────────────── */}
        <View className="m-4 bg-elevated rounded-2xl p-5">
          <View className="gap-2.5 mb-4">
            <Text className="text-[22px] font-bold text-white">{item.strasse}</Text>
            <View
              className="self-start rounded-full px-3 py-1"
              style={{ backgroundColor: badgeColor }}
            >
              <Text
                className="text-xs font-semibold"
                style={{ color: darkBadge ? '#fff' : '#1a1f24' }}
              >
                {item.gruppe}
              </Text>
            </View>
          </View>

          {/* Divider */}
          <View className="h-px bg-gray-700 mb-4" />

          <InfoRow icon="document-text-outline" label="Regulation"   value={item.beschreibung} />
          {item.prm !== '' && (
            <InfoRow icon="location-outline"    label="District"     value={item.prm} />
          )}
          {item.angebot > 0 && (
            <InfoRow icon="car-outline"         label="Spaces"       value={`${item.angebot} parking spots`} />
          )}
          {hasCoords && (
            <InfoRow
              icon="navigate-outline"
              label="Coordinates"
              value={`${item.lat?.toFixed(5)}° N, ${item.lon?.toFixed(5)}° E`}
            />
          )}
        </View>

        {/* ── OSM button — web only (native has the interactive map above) ── */}
        {hasCoords && Platform.OS === 'web' && (
          <Pressable
            className="flex-row items-center justify-center gap-2 bg-gold mx-4 rounded-xl py-3.5"
            onPress={openOSM}
          >
            <Ionicons name="open-outline" size={16} color="#25292e" />
            <Text className="text-surface font-bold text-[15px]">Open in OpenStreetMap</Text>
          </Pressable>
        )}

      </ScrollView>
    </>
  );
}
