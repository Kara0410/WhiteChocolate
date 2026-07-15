import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { AppleMaps, GoogleMaps, type CameraPosition } from 'expo-maps';
import Ionicons from '@expo/vector-icons/Ionicons';

import InfoRow from '@/components/InfoRow';
import { fetchParkingSegmentDetails } from '@/services/parkingMapData';
import type { ParkingSegment } from '@/types/parking-segment';
import { logAppError, normalizeAppError } from '@/utils/app-errors';
import { getBadgeColor } from '@/utils/parking';

type DetailState =
  | { status: 'loading' }
  | { status: 'success'; item: ParkingSegment }
  | { status: 'not-found' }
  | { status: 'error'; message: string };

function DetailStatus({
  loading = false,
  message,
}: {
  loading?: boolean;
  message: string;
}) {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Parking details',
          headerStyle: { backgroundColor: '#25292e' },
          headerTintColor: '#fff',
          headerShadowVisible: false,
        }}
      />
      <View className="flex-1 items-center justify-center gap-3 bg-surface px-6">
        {loading ? <ActivityIndicator color="#ffd33d" /> : null}
        <Text className="text-center text-base text-white">{message}</Text>
      </View>
    </>
  );
}

export default function ParkingDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [state, setState] = useState<DetailState>({ status: 'loading' });

  useEffect(() => {
    let active = true;

    if (!id) {
      setState({ status: 'not-found' });
      return () => {
        active = false;
      };
    }

    setState({ status: 'loading' });
    void fetchParkingSegmentDetails(id)
      .then((item) => {
        if (!active) {
          return;
        }

        setState(item ? { status: 'success', item } : { status: 'not-found' });
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }

        const normalized = normalizeAppError(error, 'parking-details');
        logAppError('parking-details', error, { segmentId: id });
        setState({
          status: 'error',
          message: normalized.message,
        });
      });

    return () => {
      active = false;
    };
  }, [id]);

  if (state.status === 'loading') {
    return <DetailStatus loading message="Loading parking details…" />;
  }

  if (state.status === 'error') {
    return <DetailStatus message={state.message} />;
  }

  if (state.status === 'not-found') {
    return <DetailStatus message="Parking segment not found." />;
  }

  const { item } = state;
  const title = item.streetName ?? item.sourceAreaName ?? 'Parking segment';
  const groupName =
    item.regulation.groupName ?? item.geoportalClass ?? 'Parking';
  const badgeColor = getBadgeColor(groupName);
  const darkBadge = badgeColor === '#6b7280' || badgeColor === '#f87171';
  const hasCoords =
    Number.isFinite(item.coordinates.latitude) &&
    item.coordinates.latitude >= -90 &&
    item.coordinates.latitude <= 90 &&
    Number.isFinite(item.coordinates.longitude) &&
    item.coordinates.longitude >= -180 &&
    item.coordinates.longitude <= 180;

  const openOSM = () =>
    Linking.openURL(
      `https://www.openstreetmap.org/?mlat=${item.coordinates.latitude}&mlon=${item.coordinates.longitude}&zoom=17`,
    );

  const cameraPosition: CameraPosition | undefined = hasCoords
    ? {
        coordinates: {
          latitude: item.coordinates.latitude,
          longitude: item.coordinates.longitude,
        },
        zoom: 17,
      }
    : undefined;

  const appleMarkers: AppleMaps.Marker[] = hasCoords
    ? [
        {
          id: item.id,
          coordinates: {
            latitude: item.coordinates.latitude,
            longitude: item.coordinates.longitude,
          },
          title,
        },
      ]
    : [];

  const googleMarkers: GoogleMaps.Marker[] = hasCoords
    ? [
        {
          id: item.id,
          coordinates: {
            latitude: item.coordinates.latitude,
            longitude: item.coordinates.longitude,
          },
          title,
          snippet: groupName,
          showCallout: true,
        },
      ]
    : [];

  return (
    <>
      <Stack.Screen
        options={{
          title,
          headerStyle: { backgroundColor: '#25292e' },
          headerTintColor: '#fff',
          headerShadowVisible: false,
        }}
      />

      <ScrollView className="flex-1 bg-surface" contentContainerClassName="pb-10">
        <View className="h-[260px] bg-sunken">
          {Platform.OS === 'ios' && cameraPosition ? (
            <AppleMaps.View
              style={{ flex: 1 }}
              cameraPosition={cameraPosition}
              markers={appleMarkers}
              uiSettings={{
                compassEnabled: false,
                myLocationButtonEnabled: false,
              }}
            />
          ) : Platform.OS === 'android' && cameraPosition ? (
            <GoogleMaps.View
              style={{ flex: 1 }}
              cameraPosition={cameraPosition}
              markers={googleMarkers}
              uiSettings={{
                compassEnabled: false,
                mapToolbarEnabled: false,
                myLocationButtonEnabled: false,
                scrollGesturesEnabled: false,
                zoomControlsEnabled: false,
                zoomGesturesEnabled: false,
              }}
            />
          ) : (
            <Pressable
              className="flex-1 items-center justify-center gap-2.5"
              onPress={hasCoords ? openOSM : undefined}
            >
              <Ionicons
                name="map-outline"
                size={40}
                color={hasCoords ? '#ffd33d' : '#374151'}
              />
              <Text
                className={
                  hasCoords
                    ? 'text-gold text-[15px] font-semibold'
                    : 'text-gray-600 text-[15px]'
                }
              >
                {hasCoords ? 'Open in OpenStreetMap' : 'No location data'}
              </Text>
              {hasCoords ? (
                <Text className="text-xs text-gray-500">
                  {item.coordinates.latitude.toFixed(5)},{' '}
                  {item.coordinates.longitude.toFixed(5)}
                </Text>
              ) : null}
            </Pressable>
          )}
        </View>

        <View className="m-4 rounded-2xl bg-elevated p-5">
          <View className="mb-4 gap-2.5">
            <Text className="text-[22px] font-bold text-white">{title}</Text>
            <View
              className="self-start rounded-full px-3 py-1"
              style={{ backgroundColor: badgeColor }}
            >
              <Text
                className="text-xs font-semibold"
                style={{ color: darkBadge ? '#fff' : '#1a1f24' }}
              >
                {groupName}
              </Text>
            </View>
          </View>

          <View className="mb-4 h-px bg-gray-700" />

          <InfoRow
            icon="document-text-outline"
            label="Regulation"
            value={
              item.regulation.description ?? 'No regulation description'
            }
          />
          {item.sourceAreaName ? (
            <InfoRow
              icon="location-outline"
              label="District"
              value={item.sourceAreaName}
            />
          ) : null}
          {item.capacity !== null ? (
            <InfoRow
              icon="car-outline"
              label="Spaces"
              value={`${item.capacity} spaces`}
            />
          ) : null}
          {hasCoords ? (
            <InfoRow
              icon="navigate-outline"
              label="Coordinates"
              value={`${item.coordinates.latitude.toFixed(5)} deg N, ${item.coordinates.longitude.toFixed(5)} deg E`}
            />
          ) : null}
        </View>

        {hasCoords && Platform.OS === 'web' ? (
          <Pressable
            className="mx-4 flex-row items-center justify-center gap-2 rounded-xl bg-gold py-3.5"
            onPress={openOSM}
          >
            <Ionicons name="open-outline" size={16} color="#25292e" />
            <Text className="text-[15px] font-bold text-surface">
              Open in OpenStreetMap
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </>
  );
}
