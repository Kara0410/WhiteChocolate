import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';

import {
  loginWithEmailPasswordService,
  registerWithEmailPasswordService,
  type AccountAuthClient,
} from '@/services/account-auth';
import {
  completeGoogleOAuthCallbackService,
  continueWithGoogleService,
  type GoogleOAuthAuthClient,
} from '@/services/account-google-auth';
import {
  hydrateAccountSession,
  subscribeToAccountAuthChanges,
} from '@/services/account-session';
import { supabase } from '@/lib/supabase';
import type {
  AccountActionResult,
  AccountError,
  AccountUser,
  AuthStatus,
  RegisterActionResult,
} from '@/types/account';
import {
  createAccountError,
  googleAuthFailedError,
  logAccountAuthFailure,
  logoutFailedError,
} from '@/utils/account-errors';
import { getCurrentAccountSnapshot } from '@/utils/account-state';
import { mapSupabaseUser } from '@/utils/auth-user';
import { invalidateParkingCache } from '@/utils/parking-client-cache';

type AccountContextValue = ReturnType<typeof getCurrentAccountSnapshot> & {
  status: AuthStatus;
  loading: boolean;
  error: AccountError | null;
  refresh: () => Promise<void>;
  loginWithEmailPassword: (
    email: string,
    password: string,
  ) => Promise<AccountActionResult>;
  continueWithGoogle: () => Promise<AccountActionResult>;
  completeWithGoogleCallback: (
    callbackUrl: string,
  ) => Promise<AccountActionResult>;
  registerWithEmailPassword: (
    email: string,
    password: string,
  ) => Promise<RegisterActionResult>;
  logout: () => Promise<AccountActionResult>;
  deleteAccount: () => Promise<AccountActionResult>;
  upgrade: () => Promise<AccountActionResult>;
};

const AccountContext = createContext<AccountContextValue | null>(null);

const authClient: AccountAuthClient = {
  signInWithPassword: (credentials) =>
    supabase.auth.signInWithPassword(credentials),
  signUp: (credentials) => supabase.auth.signUp(credentials),
};

const googleOAuthAuthClient: GoogleOAuthAuthClient = {
  signInWithOAuth: (credentials) =>
    supabase.auth.signInWithOAuth(credentials),
  setSession: (credentials) => supabase.auth.setSession(credentials),
};

export function AccountProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AccountUser | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AccountError | null>(null);
  const accountIdentityRef = useRef<string | null>(null);
  const googleCallbackInFlightRef = useRef<Promise<AccountActionResult> | null>(
    null,
  );

  const applyAccountUser = useCallback((nextUser: AccountUser | null) => {
    const nextIdentity = nextUser?.id ?? null;

    if (accountIdentityRef.current !== nextIdentity) {
      accountIdentityRef.current = nextIdentity;
      invalidateParkingCache();
    }

    setUser(nextUser);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    await hydrateAccountSession({
      auth: supabase.auth,
      setError,
      setLoading,
      setUser: applyAccountUser,
    });
  }, [applyAccountUser]);

  useEffect(() => {
    let active = true;

    void refresh();

    // Only synchronous state updates here. Supabase warns that awaiting auth
    // calls inside onAuthStateChange can deadlock the auth client.
    const unsubscribe = subscribeToAccountAuthChanges({
      auth: supabase.auth,
      onSession: (session) => {
        if (!active) {
          return;
        }

        applyAccountUser(mapSupabaseUser(session?.user ?? null));
        setLoading(false);

        if (session) {
          setSigningIn(false);
          setError(null);
        }
      },
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [applyAccountUser, refresh]);

  const loginWithEmailPassword = useCallback(
    async (
      email: string,
      password: string,
    ): Promise<AccountActionResult> => {
      setError(null);
      setSigningIn(true);

      try {
        const result = await loginWithEmailPasswordService({
          auth: authClient,
          email,
          password,
        });

        if (!result.ok) {
          setError(result.error);
        }

        return result;
      } finally {
        setSigningIn(false);
      }
    },
    [],
  );

  const continueWithGoogle = useCallback(
    async (): Promise<AccountActionResult> => {
      setError(null);
      setSigningIn(true);

      try {
        const result = await continueWithGoogleService({
          auth: googleOAuthAuthClient,
        });

        if (!result.ok && result.error.code !== 'GOOGLE_AUTH_CANCELLED') {
          setError(result.error);
        }

        return result;
      } catch (googleError) {
        const failedError = googleAuthFailedError(googleError);
        setError(failedError);
        return { ok: false, error: failedError };
      } finally {
        setSigningIn(false);
      }
    },
    [],
  );

  const completeWithGoogleCallback = useCallback(
    (callbackUrl: string): Promise<AccountActionResult> => {
      if (googleCallbackInFlightRef.current) {
        return googleCallbackInFlightRef.current;
      }

      const operation = (async (): Promise<AccountActionResult> => {
        setError(null);
        setSigningIn(true);

        try {
          const result = await completeGoogleOAuthCallbackService({
            auth: googleOAuthAuthClient,
            callbackUrl,
          });

          if (!result.ok && result.error.code !== 'GOOGLE_AUTH_CANCELLED') {
            setError(result.error);
          }

          return result;
        } catch (googleError) {
          const failedError = googleAuthFailedError(googleError);
          setError(failedError);
          return { ok: false, error: failedError };
        } finally {
          setSigningIn(false);
        }
      })();

      googleCallbackInFlightRef.current = operation;
      void operation.then(
        () => {
          if (googleCallbackInFlightRef.current === operation) {
            googleCallbackInFlightRef.current = null;
          }
        },
        () => {
          if (googleCallbackInFlightRef.current === operation) {
            googleCallbackInFlightRef.current = null;
          }
        },
      );

      return operation;
    },
    [],
  );

  const registerWithEmailPassword = useCallback(
    async (
      email: string,
      password: string,
    ): Promise<RegisterActionResult> => {
      setError(null);
      setSigningIn(true);

      try {
        const result = await registerWithEmailPasswordService({
          auth: authClient,
          email,
          password,
        });

        if (result.ok && result.status === 'authenticated') {
          applyAccountUser(result.user);
          setError(null);
          return result;
        }

        if (!result.ok) {
          setError(result.error);
        }

        return result;
      } finally {
        setSigningIn(false);
      }
    },
    [applyAccountUser],
  );

  const logout = useCallback(async (): Promise<AccountActionResult> => {
    setError(null);

    if (user === null) {
      return { ok: true };
    }

    setSigningOut(true);

    try {
      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        logAccountAuthFailure('logout', signOutError);
        const failedError = logoutFailedError(signOutError);
        setError(failedError);
        return { ok: false, error: failedError };
      }

      applyAccountUser(null);
      return { ok: true };
    } catch (logoutError) {
      logAccountAuthFailure('logout', logoutError);
      const failedError = logoutFailedError(logoutError);
      setError(failedError);
      return { ok: false, error: failedError };
    } finally {
      setSigningOut(false);
    }
  }, [applyAccountUser, user]);

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

  const value = useMemo(
    () => ({
      ...accountSnapshot,
      status,
      loading,
      error,
      refresh,
      loginWithEmailPassword,
      continueWithGoogle,
      completeWithGoogleCallback,
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
      continueWithGoogle,
      completeWithGoogleCallback,
      loginWithEmailPassword,
      logout,
      registerWithEmailPassword,
      refresh,
      status,
      upgrade,
    ],
  );

  return (
    <AccountContext.Provider value={value}>
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount() {
  const value = useContext(AccountContext);

  if (value === null) {
    throw new Error('useAccount must be used within AccountProvider');
  }

  return value;
}
