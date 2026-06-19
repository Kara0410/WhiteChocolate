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
  },
  android: {
    package: 'com.whitechoclate.app',
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
    // Maps SDK keys are embedded into the native build (not JS bundle).
    // Restrict Android key to your package name + SHA-1 in Google Cloud Console.
    // Restrict iOS key to your bundle identifier.
    // Keys are read from environment at build time only — not exposed at runtime.
    [
      'react-native-maps',
      {
        androidGoogleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY ?? '',
        iosGoogleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY ?? '',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
});
