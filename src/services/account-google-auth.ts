import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import type { AccountActionResult } from '@/types/account';
import {
  performGoogleOAuth,
  type GoogleOAuthAuthClient,
} from '@/services/account-google-auth-core';

const APP_SCHEME = 'whitechoclate';
const CALLBACK_PATH = 'auth/callback';

WebBrowser.maybeCompleteAuthSession();

export type { GoogleOAuthAuthClient } from '@/services/account-google-auth-core';
export { parseGoogleOAuthCallback } from '@/services/account-google-auth-core';

export function getGoogleOAuthRedirectUrl() {
  return Linking.createURL(CALLBACK_PATH, { scheme: APP_SCHEME });
}

export async function continueWithGoogleService({
  auth,
}: {
  auth: GoogleOAuthAuthClient;
}): Promise<AccountActionResult> {
  const redirectTo = getGoogleOAuthRedirectUrl();

  return performGoogleOAuth({
    auth,
    openAuthSessionAsync: (url, redirectUrl) =>
      WebBrowser.openAuthSessionAsync(url, redirectUrl),
    platform: Platform.OS,
    redirectTo,
  });
}
