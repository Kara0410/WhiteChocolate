import type { Session, User } from '@supabase/supabase-js';

import type {
  AccountActionResult,
  AccountUser,
  RegisterActionResult,
} from '@/types/account';
import {
  accountAuthError,
  logAccountAuthFailure,
  loginFailedError,
  registerFailedError,
} from '@/utils/account-errors';
import {
  validateAccountEmail,
  validateAccountPassword,
} from '@/utils/account-validation';
import { mapSupabaseUser } from '@/utils/auth-user';

export type AccountAuthClient = {
  signInWithPassword: (credentials: {
    email: string;
    password: string;
  }) => Promise<{ data?: { session?: Session | null }; error: unknown }>;
  signUp: (credentials: {
    email: string;
    password: string;
  }) => Promise<{
    data?: { user?: User | null; session?: Session | null };
    error: unknown;
  }>;
};

function authenticatedRegisterResult(
  session: Session | null | undefined,
): RegisterActionResult | null {
  const accountUser: AccountUser | null = mapSupabaseUser(
    session?.user ?? null,
  );

  return accountUser
    ? { ok: true, status: 'authenticated', user: accountUser }
    : null;
}

export function resolveRegisterSuccess({
  email,
  session,
  user,
}: {
  email: string;
  session?: Session | null;
  user?: User | null;
}): RegisterActionResult {
  const authenticated = authenticatedRegisterResult(session);

  if (authenticated) {
    return authenticated;
  }

  if (user) {
    return {
      ok: true,
      status: 'confirmation-required',
      email,
    };
  }

  return {
    ok: false,
    error: accountAuthError(
      'signup',
      new Error('Supabase signup returned no user and no session.'),
    ),
  };
}

export async function loginWithEmailPasswordService({
  auth,
  email,
  password,
}: {
  auth: AccountAuthClient;
  email: string;
  password: string;
}): Promise<AccountActionResult> {
  const emailResult = validateAccountEmail(email);
  if (!emailResult.ok) {
    return { ok: false, error: emailResult.error };
  }

  const passwordResult = validateAccountPassword(password);
  if (!passwordResult.ok) {
    return { ok: false, error: passwordResult.error };
  }

  try {
    const { error } = await auth.signInWithPassword({
      email: emailResult.email,
      password,
    });

    if (error) {
      logAccountAuthFailure('login', error);
      return { ok: false, error: loginFailedError(error) };
    }

    return { ok: true };
  } catch (error) {
    logAccountAuthFailure('login', error);
    return { ok: false, error: loginFailedError(error) };
  }
}

export async function registerWithEmailPasswordService({
  auth,
  email,
  password,
}: {
  auth: AccountAuthClient;
  email: string;
  password: string;
}): Promise<RegisterActionResult> {
  const emailResult = validateAccountEmail(email);
  if (!emailResult.ok) {
    return { ok: false, error: emailResult.error };
  }

  const passwordResult = validateAccountPassword(password);
  if (!passwordResult.ok) {
    return { ok: false, error: passwordResult.error };
  }

  try {
    const { data, error } = await auth.signUp({
      email: emailResult.email,
      password,
    });

    if (error) {
      logAccountAuthFailure('signup', error);
      return { ok: false, error: registerFailedError(error) };
    }

    return resolveRegisterSuccess({
      email: emailResult.email,
      session: data?.session ?? null,
      user: data?.user ?? null,
    });
  } catch (error) {
    logAccountAuthFailure('signup', error);
    return { ok: false, error: registerFailedError(error) };
  }
}
