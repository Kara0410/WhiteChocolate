// Import the compiled Tailwind stylesheet — must happen once at the app root.
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import '../../global.css';

import { cssInterop } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Stack,
  useGlobalSearchParams,
  usePathname,
} from 'expo-router';

import {
  OnboardingLoadingScreen,
  OnboardingProvider,
  useOnboarding,
} from '@/context/OnboardingContext';
import { AccountProvider } from '@/context/AccountContext';
import { AuthSheetProvider } from '@/context/AuthSheetContext';
import { cleanupLegacyGarageStorage } from '@/utils/legacy-storage-cleanup';

// SafeAreaView is a third-party component; NativeWind doesn't patch it automatically.
// cssInterop wires its className prop to the underlying style prop.
cssInterop(SafeAreaView, { className: 'style' });

function RootStack() {
  const { isHydrated, shouldShowOnboarding } = useOnboarding();
  const pathname = usePathname();
  const { accountMode, step } = useGlobalSearchParams<{
    accountMode?: string;
    step?: string;
  }>();
  const isRecoveryRoute =
    pathname === '/auth/forgot-password' ||
    pathname === '/auth/reset-password';
  const isOnboardingLoginIntent =
    pathname === '/onboarding' &&
    step === 'account' &&
    accountMode === 'login';

  // A native callback can arrive before hydration; keep its unprotected route
  // mounted so the browser handoff can finish instead of showing not-found.
  if (!isHydrated && pathname !== '/auth/callback' && !isRecoveryRoute) {
    return <OnboardingLoadingScreen />;
  }

  return (
    <Stack>
      <Stack.Screen
        name="auth/callback"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="auth/forgot-password"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="auth/reset-password"
        options={{ headerShown: false }}
      />
      <Stack.Protected
        guard={shouldShowOnboarding || isOnboardingLoginIntent}
      >
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
  useEffect(() => {
    void cleanupLegacyGarageStorage();
  }, []);

  return (
    <GestureHandlerRootView className="flex-1">
      <AccountProvider>
        <OnboardingProvider>
          <AuthSheetProvider>
            <RootStack />
          </AuthSheetProvider>
        </OnboardingProvider>
      </AccountProvider>
    </GestureHandlerRootView>
  );
}
