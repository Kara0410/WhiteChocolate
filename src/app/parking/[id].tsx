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
import {
  Car,
  ExternalLink,
  FileText,
  Map as MapIcon,
  MapPin,
  Navigation,
} from 'lucide-react-native';

import InfoRow from '@/components/InfoRow';
import { WHITE_CHOCOLATE_GOOGLE_MAP_STYLE } from '@/components/parking-map/map-style';
import { fetchParkingSegmentDetails } from '@/services/parkingMapData';
import type { ParkingSegment } from '@/types/parking-segment';
import { logAppError, normalizeAppError } from '@/utils/app-errors';
import { getBadgeColor } from '@/utils/parking';
import { COLORS } from '@/constants/theme';

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
          headerStyle: { backgroundColor: COLORS.surface.default },
          headerTintColor: COLORS.icon.default,
          headerShadowVisible: false,
        }}
      />
      <View className="flex-1 items-center justify-center gap-3 bg-background-default px-6">
        {loading ? <ActivityIndicator color={COLORS.accent.primary} /> : null}
        <Text className="text-center text-base text-ink-primary">{message}</Text>
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
          headerStyle: { backgroundColor: COLORS.surface.default },
          headerTintColor: COLORS.icon.default,
          headerShadowVisible: false,
        }}
      />

      <ScrollView className="flex-1 bg-background-default" contentContainerClassName="pb-10">
        <View className="h-[260px] bg-surface-muted">
          {Platform.OS === 'ios' && cameraPosition ? (
            <AppleMaps.View
              style={{ flex: 1 }}
              cameraPosition={cameraPosition}
              markers={appleMarkers}
              properties={{
                elevation: 'FLAT' as AppleMaps.MapProperties['elevation'],
                emphasis: 'MUTED' as AppleMaps.MapProperties['emphasis'],
                pointsOfInterest: { including: [] },
              }}
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
              properties={{
                mapStyleOptions: { json: WHITE_CHOCOLATE_GOOGLE_MAP_STYLE },
              }}
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
              <MapIcon
                size={40}
                color={
                  hasCoords
                    ? COLORS.accent.primary
                    : COLORS.icon.muted
                }
              />
              <Text
                className={
                  hasCoords
                    ? 'text-accent-primary text-[15px] font-semibold'
                    : 'text-ink-secondary text-[15px]'
                }
              >
                {hasCoords ? 'Open in OpenStreetMap' : 'No location data'}
              </Text>
              {hasCoords ? (
                <Text className="text-xs text-ink-secondary">
                  {item.coordinates.latitude.toFixed(5)},{' '}
                  {item.coordinates.longitude.toFixed(5)}
                </Text>
              ) : null}
            </Pressable>
          )}
        </View>

        <View className="m-4 rounded-card border border-border-subtle bg-surface-raised p-5 shadow-card">
          <View className="mb-4 gap-2.5">
            <Text className="text-[22px] font-bold text-ink-primary">{title}</Text>
            <View
              className="self-start rounded-full px-3 py-1"
              style={{ backgroundColor: badgeColor }}
            >
              <Text
                className="text-xs font-semibold"
                style={{ color: COLORS.text.onAccent }}
              >
                {groupName}
              </Text>
            </View>
          </View>

          <View className="mb-4 h-px bg-border-subtle" />

          <InfoRow
            icon={FileText}
            label="Regulation"
            value={
              item.regulation.description ?? 'No regulation description'
            }
          />
          {item.sourceAreaName ? (
            <InfoRow
              icon={MapPin}
              label="District"
              value={item.sourceAreaName}
            />
          ) : null}
          {item.capacity !== null ? (
            <InfoRow
              icon={Car}
              label="Spaces"
              value={`${item.capacity} spaces`}
            />
          ) : null}
          {hasCoords ? (
            <InfoRow
              icon={Navigation}
              label="Coordinates"
              value={`${item.coordinates.latitude.toFixed(5)} deg N, ${item.coordinates.longitude.toFixed(5)} deg E`}
            />
          ) : null}
        </View>

        {hasCoords && Platform.OS === 'web' ? (
          <Pressable
            className="mx-4 flex-row items-center justify-center gap-2 rounded-xl bg-accent-primary py-3.5"
            onPress={openOSM}
          >
            <ExternalLink size={16} color={COLORS.text.onAccent} />
            <Text className="text-[15px] font-bold text-ink-on-accent">
              Open in OpenStreetMap
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </>
  );
}
