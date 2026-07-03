import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import type { Database } from '@/types/database';

const configuredUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!configuredUrl) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL.');
}

if (!supabaseAnonKey) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_ANON_KEY.');
}

// Accept an accidentally copied REST endpoint while keeping createClient on
// the project base URL. New configuration should use the base URL directly.
const supabaseUrl = configuredUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');

const isWeb = Platform.OS === 'web';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // On native the session must be stored explicitly; AsyncStorage is used
    // because expo-secure-store is not installed and SecureStore's ~2KB iOS
    // value limit does not fit a Supabase session JSON (docs/auth-foundation.md).
    // On web, supabase-js defaults to localStorage with its own SSR guards.
    ...(isWeb ? {} : { storage: AsyncStorage }),
    autoRefreshToken: true,
    persistSession: true,
    // URL fragment detection only exists in browsers; native sign-in uses
    // email OTP codes, not callback URLs.
    detectSessionInUrl: isWeb,
  },
});

// React Native timers stop in the background, so token refresh must be tied
// to the app lifecycle (official Supabase Expo pattern).
if (!isWeb) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      void supabase.auth.startAutoRefresh();
    } else {
      void supabase.auth.stopAutoRefresh();
    }
  });
}
