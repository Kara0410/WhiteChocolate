import type { ExpoConfig } from 'expo/config';
import type { ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'White_choclate',
  slug: 'White_choclate',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'whitechoclate',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  ios: {
    bundleIdentifier: 'com.whitechoclate.app',
    icon: './assets/expo.icon',
    infoPlist: {
      LSApplicationQueriesSchemes: ['comgooglemaps', 'waze'],
    },
  },
  android: {
    package: 'com.whitechoclate.app',
    config: {
      googleMaps: {
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY,
      },
    },
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#208AEF',
        android: {
          image: './assets/images/splash-icon.png',
          imageWidth: 76,
        },
      },
    ],
    // Android Google Maps key is embedded into the native build (not JS bundle).
    // Restrict Android key to your package name + SHA-1 in Google Cloud Console.
    // iOS uses Apple Maps through expo-maps and does not need a Google Maps key.
    // The key is read from environment at build time only — not exposed at runtime.
    [
      'expo-maps',
      {
        requestLocationPermission: true,
        locationPermission: 'Allow WhiteChoclate to use your location',
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Allow WhiteChoclate to search nearby parking spots around places.',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: 'ae6ba11b-273b-4549-bae3-39f635836871',
    },
  },
});
