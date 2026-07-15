import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import {
  APP_AUTH_SCHEME,
  GOOGLE_AUTH_CALLBACK_PATH,
} from '@/constants/auth';
import type { AccountActionResult } from '@/types/account';
import {
  completeGoogleOAuthCallback,
  performGoogleOAuth,
  type GoogleOAuthAuthClient,
} from '@/services/account-google-auth-core';

WebBrowser.maybeCompleteAuthSession();

export type { GoogleOAuthAuthClient } from '@/services/account-google-auth-core';
export { parseGoogleOAuthCallback } from '@/services/account-google-auth-core';

export function getGoogleOAuthRedirectUrl() {
  return Linking.createURL(GOOGLE_AUTH_CALLBACK_PATH, {
    scheme: APP_AUTH_SCHEME,
  });
}

export async function completeGoogleOAuthCallbackService({
  auth,
  callbackUrl,
}: {
  auth: GoogleOAuthAuthClient;
  callbackUrl: string;
}): Promise<AccountActionResult> {
  return completeGoogleOAuthCallback({
    auth,
    callbackUrl,
    expectedRedirectTo: getGoogleOAuthRedirectUrl(),
  });
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
