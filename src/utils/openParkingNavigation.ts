import { Alert, Platform } from 'react-native';
import * as Linking from 'expo-linking';

export type OpenParkingNavigationOptions = {
  latitude: number;
  longitude: number;
  label?: string;
};

type NavigationOption = {
  text: string;
  url: string;
};

function hasValidCoordinates(latitude: number, longitude: number) {
  return Number.isFinite(latitude) && Number.isFinite(longitude);
}

function getFallbackMapUrl(latitude: number, longitude: number) {
  const query = encodeURIComponent(`${latitude},${longitude}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

async function openUrlWithFallback(url: string, fallbackUrl: string) {
  try {
    await Linking.openURL(url);
  } catch (error) {
    if (__DEV__) {
      console.warn('Unable to open navigation URL', error);
    }

    try {
      await Linking.openURL(fallbackUrl);
    } catch (fallbackError) {
      if (__DEV__) {
        console.warn('Unable to open fallback navigation URL', fallbackError);
      }
    }
  }
}

async function canOpenNavigationUrl(url: string) {
  try {
    return await Linking.canOpenURL(url);
  } catch (error) {
    if (__DEV__) {
      console.warn('Unable to check navigation app availability', error);
    }

    return false;
  }
}

async function openIosNavigation(
  latitude: number,
  longitude: number,
  label: string,
) {
  const encodedLabel = encodeURIComponent(label);
  const fallbackUrl = getFallbackMapUrl(latitude, longitude);
  const appleMapsUrl = `http://maps.apple.com/?ll=${latitude},${longitude}&q=${encodedLabel}`;
  const googleMapsUrl = `comgooglemaps://?q=${latitude},${longitude}`;
  const wazeUrl = `waze://?ll=${latitude},${longitude}&navigate=yes`;
  const options: NavigationOption[] = [
    { text: 'Apple Maps', url: appleMapsUrl },
  ];

  const [canOpenGoogleMaps, canOpenWaze] = await Promise.all([
    canOpenNavigationUrl(googleMapsUrl),
    canOpenNavigationUrl(wazeUrl),
  ]);

  if (canOpenGoogleMaps) {
    options.push({ text: 'Google Maps', url: googleMapsUrl });
  }

  if (canOpenWaze) {
    options.push({ text: 'Waze', url: wazeUrl });
  }

  Alert.alert(
    'Navigate to spot',
    'Choose a maps app.',
    [
      ...options.map((option) => ({
        text: option.text,
        onPress: () => {
          void openUrlWithFallback(option.url, fallbackUrl);
        },
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ],
    { cancelable: true },
  );
}

export async function openParkingNavigation({
  latitude,
  longitude,
  label = 'Parking spot',
}: OpenParkingNavigationOptions) {
  if (!hasValidCoordinates(latitude, longitude)) {
    Alert.alert(
      'Location unavailable',
      'This spot does not have valid coordinates.',
    );
    return;
  }

  const safeLabel = label.trim() || 'Parking spot';
  const fallbackUrl = getFallbackMapUrl(latitude, longitude);

  if (Platform.OS === 'ios') {
    await openIosNavigation(latitude, longitude, safeLabel);
    return;
  }

  if (Platform.OS === 'android') {
    const geoLabel = encodeURIComponent(safeLabel);
    const geoUrl = `geo:0,0?q=${latitude},${longitude}(${geoLabel})`;
    await openUrlWithFallback(geoUrl, fallbackUrl);
    return;
  }

  await openUrlWithFallback(fallbackUrl, fallbackUrl);
}
