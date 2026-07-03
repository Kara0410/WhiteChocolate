import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { supabase } from '@/lib/supabase';
import {
  type AccountActionResult,
  type AccountError,
  type AccountUser,
  type AuthStatus,
} from '@/types/account';
import {
  accountLoadError,
  createAccountError,
  logoutFailedError,
  signInFailedError,
  verifyFailedError,
} from '@/utils/account-errors';
import { getCurrentAccountSnapshot } from '@/utils/account-state';
import { mapSupabaseUser } from '@/utils/auth-user';

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function useAccount() {
  const [user, setUser] = useState<AccountUser | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AccountError | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      setUser(mapSupabaseUser(data.session?.user ?? null));
    } catch (loadError) {
      setError(accountLoadError(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    void refresh();

    // Only synchronous state updates in this callback: awaiting Supabase
    // calls inside onAuthStateChange can deadlock the auth client.
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) {
        return;
      }

      setUser(mapSupabaseUser(session?.user ?? null));

      if (session) {
        setPendingEmail(null);
        setError(null);
      }
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [refresh]);

  const startEmailSignIn = useCallback(
    async (email: string): Promise<AccountActionResult> => {
      setError(null);

      const normalizedEmail = normalizeEmail(email);

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        const invalidError = createAccountError(
          'SIGNIN_FAILED',
          'Enter a valid email address.',
        );
        setError(invalidError);
        return { ok: false, error: invalidError };
      }

      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: { shouldCreateUser: true },
      });

      if (otpError) {
        if (__DEV__) {
          console.warn('[useAccount] signInWithOtp failed', {
            name: otpError.name,
            message: otpError.message,
            status: otpError.status,
            code: otpError.code,
          });
        }

        const sendError = signInFailedError(otpError);
        setError(sendError);
        return { ok: false, error: sendError };
      }

      setPendingEmail(normalizedEmail);
      return { ok: true };
    },
    [],
  );

  const verifyEmailOtp = useCallback(
    async (email: string, token: string): Promise<AccountActionResult> => {
      setError(null);

      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: normalizeEmail(email),
        token: token.trim(),
        type: 'email',
      });

      if (verifyError) {
        const failedError = verifyFailedError(verifyError);
        setError(failedError);
        return { ok: false, error: failedError };
      }

      // onAuthStateChange delivers the session and clears pendingEmail.
      return { ok: true };
    },
    [],
  );

  const cancelEmailSignIn = useCallback(() => {
    setPendingEmail(null);
    setError(null);
  }, []);

  const logout = useCallback(async (): Promise<AccountActionResult> => {
    setError(null);

    if (user === null) {
      return { ok: true };
    }

    setSigningOut(true);

    try {
      // Product decision (docs/auth-foundation.md §5.6): sign-out only ends
      // the session. Local garage, favorites, and preferences stay on the
      // device; remote data is untouched.
      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        const failedError = logoutFailedError(signOutError);
        setError(failedError);
        return { ok: false, error: failedError };
      }

      return { ok: true };
    } finally {
      setSigningOut(false);
    }
  }, [user]);

  const deleteAccount =
    useCallback(async (): Promise<AccountActionResult> => {
      const deleteError = createAccountError(
        'DELETE_NOT_IMPLEMENTED',
        'Account deletion will be connected when the backend deletion flow exists.',
      );
      setError(deleteError);
      return { ok: false, error: deleteError };
    }, []);

  const upgrade = useCallback(async (): Promise<AccountActionResult> => {
    const upgradeError = createAccountError(
      'UPGRADE_NOT_IMPLEMENTED',
      'Premium purchases are not connected yet.',
    );
    setError(upgradeError);
    return { ok: false, error: upgradeError };
  }, []);

  const accountSnapshot = useMemo(
    () => getCurrentAccountSnapshot(user),
    [user],
  );

  const status: AuthStatus = signingOut
    ? 'signingOut'
    : user
      ? 'authenticated'
      : error?.code === 'LOAD_FAILED'
        ? 'error'
        : pendingEmail
          ? 'signingIn'
          : 'anonymous';

  return useMemo(
    () => ({
      ...accountSnapshot,
      status,
      pendingEmail,
      loading,
      error,
      refresh,
      startEmailSignIn,
      verifyEmailOtp,
      cancelEmailSignIn,
      logout,
      deleteAccount,
      upgrade,
    }),
    [
      accountSnapshot,
      cancelEmailSignIn,
      deleteAccount,
      error,
      loading,
      logout,
      pendingEmail,
      refresh,
      startEmailSignIn,
      status,
      upgrade,
      verifyEmailOtp,
    ],
  );
}
