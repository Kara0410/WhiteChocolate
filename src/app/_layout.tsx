// Import the compiled Tailwind stylesheet — must happen once at the app root.
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import '../../global.css';

import { cssInterop } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';

import {
  OnboardingLoadingScreen,
  OnboardingProvider,
  useOnboarding,
} from '@/context/OnboardingContext';
import { AuthSheetProvider } from '@/context/AuthSheetContext';

// SafeAreaView is a third-party component; NativeWind doesn't patch it automatically.
// cssInterop wires its className prop to the underlying style prop.
cssInterop(SafeAreaView, { className: 'style' });

function RootStack() {
  const { isHydrated, shouldShowOnboarding } = useOnboarding();

  if (!isHydrated) {
    return <OnboardingLoadingScreen />;
  }

  return (
    <Stack>
      <Stack.Protected guard={shouldShowOnboarding}>
        <Stack.Screen
          name="onboarding"
          options={{ headerShown: false }}
        />
      </Stack.Protected>
      <Stack.Protected guard={!shouldShowOnboarding}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="parking/[id]" options={{ headerShown: true }} />
        <Stack.Screen
          name="billing"
          options={{ headerShown: false, presentation: 'card' }}
        />
        <Stack.Screen
          name="fresh-check"
          options={{
            animation: 'fade',
            headerShown: false,
            presentation: 'transparentModal',
          }}
        />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <OnboardingProvider>
        <AuthSheetProvider>
          <RootStack />
        </AuthSheetProvider>
      </OnboardingProvider>
    </GestureHandlerRootView>
  );
}
