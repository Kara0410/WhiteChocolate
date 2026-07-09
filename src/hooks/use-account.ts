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
  invalidEmailError,
  loginFailedError,
  logoutFailedError,
  registerFailedError,
  weakPasswordError,
} from '@/utils/account-errors';
import { getCurrentAccountSnapshot } from '@/utils/account-state';
import { mapSupabaseUser } from '@/utils/auth-user';

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(password: string) {
  return password.length >= 8;
}

export function useAccount() {
  const [user, setUser] = useState<AccountUser | null>(null);
  const [signingIn, setSigningIn] = useState(false);
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
        setSigningIn(false);
        setError(null);
      }
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [refresh]);

  const loginWithEmailPassword = useCallback(
    async (
      email: string,
      password: string,
    ): Promise<AccountActionResult> => {
      setError(null);

      const normalizedEmail = normalizeEmail(email);

      if (!isValidEmail(normalizedEmail)) {
        const invalidError = invalidEmailError();
        setError(invalidError);
        return { ok: false, error: invalidError };
      }

      if (!isValidPassword(password)) {
        const passwordError = weakPasswordError();
        setError(passwordError);
        return { ok: false, error: passwordError };
      }

      setSigningIn(true);

      try {
        const { error: signInError } =
          await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
          });

        if (signInError) {
          const failedError = loginFailedError(signInError);
          setError(failedError);
          return { ok: false, error: failedError };
        }

        return { ok: true };
      } finally {
        setSigningIn(false);
      }
    },
    [],
  );

  const registerWithEmailPassword = useCallback(
    async (
      email: string,
      password: string,
    ): Promise<AccountActionResult> => {
      setError(null);

      const normalizedEmail = normalizeEmail(email);

      if (!isValidEmail(normalizedEmail)) {
        const invalidError = invalidEmailError();
        setError(invalidError);
        return { ok: false, error: invalidError };
      }

      if (!isValidPassword(password)) {
        const passwordError = weakPasswordError();
        setError(passwordError);
        return { ok: false, error: passwordError };
      }

      setSigningIn(true);

      try {
        const { error: signUpError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
        });

        if (signUpError) {
          const failedError = registerFailedError(signUpError);
          setError(failedError);
          return { ok: false, error: failedError };
        }

        // onAuthStateChange delivers the session when email confirmation is
        // disabled in Supabase Dashboard > Authentication > Providers > Email.
        return { ok: true };
      } finally {
        setSigningIn(false);
      }
    },
    [],
  );

  const logout = useCallback(async (): Promise<AccountActionResult> => {
    setError(null);

    if (user === null) {
      return { ok: true };
    }

    setSigningOut(true);

    try {
      // Product decision: sign-out only ends
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
        : signingIn
          ? 'signingIn'
          : 'anonymous';

  return useMemo(
    () => ({
      ...accountSnapshot,
      status,
      loading,
      error,
      refresh,
      loginWithEmailPassword,
      registerWithEmailPassword,
      logout,
      deleteAccount,
      upgrade,
    }),
    [
      accountSnapshot,
      deleteAccount,
      error,
      loading,
      loginWithEmailPassword,
      logout,
      registerWithEmailPassword,
      refresh,
      status,
      upgrade,
    ],
  );
}
