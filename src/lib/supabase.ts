import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock } from '@supabase/supabase-js';
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

if (typeof __DEV__ !== 'undefined' && __DEV__) {
  try {
    const parsedUrl = new URL(supabaseUrl);
    if (!parsedUrl.hostname.endsWith('.supabase.co')) {
      console.warn('[Supabase] URL does not look like a Supabase project URL.');
    }
  } catch {
    console.warn('[Supabase] EXPO_PUBLIC_SUPABASE_URL is not a valid URL.');
  }
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // On native the session must be stored explicitly; AsyncStorage is used
    // because expo-secure-store is not installed and SecureStore's ~2KB iOS
    // value limit does not fit a Supabase session JSON.
    // On web, supabase-js defaults to localStorage with its own SSR guards.
    ...(isWeb ? {} : { storage: AsyncStorage }),
    autoRefreshToken: true,
    persistSession: true,
    // Native password recovery deep links are processed explicitly by the
    // reset-password route; do not let Supabase consume them implicitly.
    detectSessionInUrl: false,
    lock: processLock,
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
