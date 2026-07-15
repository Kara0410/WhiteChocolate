import * as Linking from 'expo-linking';

import {
  APP_AUTH_SCHEME,
  PASSWORD_RECOVERY_PATH,
} from '@/constants/auth';
import {
  establishPasswordRecoverySessionCore,
  finishPasswordRecoveryCore,
  parsePasswordRecoveryCallback,
  requestPasswordResetCore,
  updateRecoveredPasswordCore,
  type PasswordRecoveryAuthClient,
} from '@/services/account-password-recovery-core';
import type { AccountActionResult } from '@/types/account';

export type { ParsedPasswordRecoveryCallback, PasswordRecoveryAuthClient } from '@/services/account-password-recovery-core';

export function getPasswordRecoveryRedirectUrl() {
  return Linking.createURL(PASSWORD_RECOVERY_PATH, {
    scheme: APP_AUTH_SCHEME,
  });
}

export { parsePasswordRecoveryCallback };

export function requestPasswordResetService({
  auth,
  email,
}: {
  auth: Pick<PasswordRecoveryAuthClient, 'resetPasswordForEmail'>;
  email: string;
}): Promise<AccountActionResult> {
  return requestPasswordResetCore({
    auth,
    email,
    redirectTo: getPasswordRecoveryRedirectUrl(),
  });
}

export function establishPasswordRecoverySession({
  auth,
  callbackUrl,
}: {
  auth: Pick<
    PasswordRecoveryAuthClient,
    'exchangeCodeForSession' | 'setSession'
  >;
  callbackUrl: string;
}): Promise<AccountActionResult> {
  return establishPasswordRecoverySessionCore({
    auth,
    callbackUrl,
    expectedRedirectTo: getPasswordRecoveryRedirectUrl(),
  });
}

export const updateRecoveredPasswordService = updateRecoveredPasswordCore;
export const finishPasswordRecoveryService = finishPasswordRecoveryCore;
