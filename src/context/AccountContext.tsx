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
  deleteAccountService,
  type AccountDeletionClient,
} from '@/services/account-deletion';
import {
  completeGoogleOAuthCallbackService,
  continueWithGoogleService,
  type GoogleOAuthAuthClient,
} from '@/services/account-google-auth';
import {
  establishPasswordRecoverySession,
  finishPasswordRecoveryService,
  requestPasswordResetService,
  updateRecoveredPasswordService,
  type PasswordRecoveryAuthClient,
  type PasswordRecoverySource,
} from '@/services/account-password-recovery';
import {
  hydrateAccountSession,
  subscribeToAccountAuthChanges,
} from '@/services/account-session';
import { supabase } from '@/lib/supabase';
import type {
  AccountActionResult,
  AccountError,
  AccountUser,
  AccountDeletionStatus,
  AuthStatus,
  PasswordRecoveryStatus,
  RegisterActionResult,
} from '@/types/account';
import {
  createAccountError,
  googleAuthFailedError,
  logAccountAuthFailure,
  logoutFailedError,
  accountDeletionError,
} from '@/utils/account-errors';
import { getCurrentAccountSnapshot } from '@/utils/account-state';
import { mapSupabaseUser } from '@/utils/auth-user';
import { invalidateParkingCache } from '@/utils/parking-client-cache';

type AccountContextValue = ReturnType<typeof getCurrentAccountSnapshot> & {
  status: AuthStatus;
  loading: boolean;
  error: AccountError | null;
  deletionStatus: AccountDeletionStatus;
  refresh: () => Promise<void>;
  loginWithEmailPassword: (
    email: string,
    password: string,
  ) => Promise<AccountActionResult>;
  continueWithGoogle: () => Promise<AccountActionResult>;
  completeWithGoogleCallback: (
    callbackUrl: string,
  ) => Promise<AccountActionResult>;
  recoveryStatus: PasswordRecoveryStatus;
  requestPasswordReset: (
    email: string,
    source?: PasswordRecoverySource,
  ) => Promise<AccountActionResult>;
  completePasswordRecovery: (
    callbackUrl: string,
  ) => Promise<AccountActionResult>;
  updateRecoveredPassword: (
    password: string,
  ) => Promise<AccountActionResult>;
  finishPasswordRecovery: () => Promise<AccountActionResult>;
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

const passwordRecoveryAuthClient: PasswordRecoveryAuthClient = {
  resetPasswordForEmail: (email, options) =>
    supabase.auth.resetPasswordForEmail(email, options),
  exchangeCodeForSession: (code) => supabase.auth.exchangeCodeForSession(code),
  setSession: (credentials) => supabase.auth.setSession(credentials),
  updateUser: (attributes) => supabase.auth.updateUser(attributes),
  signOut: () => supabase.auth.signOut(),
};

const accountDeletionClient: AccountDeletionClient = {
  functions: {
    invoke: (functionName) => supabase.functions.invoke(functionName),
  },
};

export function AccountProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AccountUser | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AccountError | null>(null);
  const [deletionStatus, setDeletionStatus] =
    useState<AccountDeletionStatus>('idle');
  const [recoveryStatus, setRecoveryStatus] =
    useState<PasswordRecoveryStatus>('idle');
  const accountIdentityRef = useRef<string | null>(null);
  const googleCallbackInFlightRef = useRef<Promise<AccountActionResult> | null>(
    null,
  );
  const passwordResetInFlightRef = useRef<Promise<AccountActionResult> | null>(
    null,
  );
  const passwordRecoveryInFlightRef = useRef<
    Promise<AccountActionResult> | null
  >(null);
  const passwordUpdateInFlightRef = useRef<Promise<AccountActionResult> | null>(
    null,
  );
  const passwordRecoveryFinishInFlightRef = useRef<
    Promise<AccountActionResult> | null
  >(null);
  const recoverySessionActiveRef = useRef(false);
  const accountDeletionInFlightRef = useRef<Promise<AccountActionResult> | null>(
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

  const requestPasswordReset = useCallback(
    (
      email: string,
      source?: PasswordRecoverySource,
    ): Promise<AccountActionResult> => {
      if (passwordResetInFlightRef.current) {
        return passwordResetInFlightRef.current;
      }

      const operation = (async () => {
        setError(null);
        setRecoveryStatus('requestingReset');

        const result = await requestPasswordResetService({
          auth: passwordRecoveryAuthClient,
          email,
          source,
        });

        if (!result.ok) {
          setError(result.error);
          setRecoveryStatus('error');
        } else {
          setRecoveryStatus('completed');
        }

        return result;
      })();

      passwordResetInFlightRef.current = operation;
      void operation.then(
        () => {
          if (passwordResetInFlightRef.current === operation) {
            passwordResetInFlightRef.current = null;
          }
        },
        () => {
          if (passwordResetInFlightRef.current === operation) {
            passwordResetInFlightRef.current = null;
          }
        },
      );

      return operation;
    },
    [],
  );

  const completePasswordRecovery = useCallback(
    (callbackUrl: string): Promise<AccountActionResult> => {
      if (passwordRecoveryInFlightRef.current) {
        return passwordRecoveryInFlightRef.current;
      }

      const operation = (async () => {
        setError(null);
        setRecoveryStatus('processingRecovery');
        recoverySessionActiveRef.current = false;

        const result = await establishPasswordRecoverySession({
          auth: passwordRecoveryAuthClient,
          callbackUrl,
        });

        if (!result.ok) {
          setError(result.error);
          setRecoveryStatus('error');
        } else {
          recoverySessionActiveRef.current = true;
          setRecoveryStatus('completed');
        }

        return result;
      })();

      passwordRecoveryInFlightRef.current = operation;
      void operation.then(
        () => {
          if (passwordRecoveryInFlightRef.current === operation) {
            passwordRecoveryInFlightRef.current = null;
          }
        },
        () => {
          if (passwordRecoveryInFlightRef.current === operation) {
            passwordRecoveryInFlightRef.current = null;
          }
        },
      );

      return operation;
    },
    [],
  );

  const updateRecoveredPassword = useCallback(
    (password: string): Promise<AccountActionResult> => {
      if (passwordUpdateInFlightRef.current) {
        return passwordUpdateInFlightRef.current;
      }

      const operation = (async () => {
        setError(null);
        setRecoveryStatus('updatingPassword');

        const result = await updateRecoveredPasswordService({
          auth: passwordRecoveryAuthClient,
          password,
          recoverySessionActive: recoverySessionActiveRef.current,
        });

        if (!result.ok) {
          setError(result.error);
          setRecoveryStatus('error');
        } else {
          setRecoveryStatus('completed');
        }

        return result;
      })();

      passwordUpdateInFlightRef.current = operation;
      void operation.then(
        () => {
          if (passwordUpdateInFlightRef.current === operation) {
            passwordUpdateInFlightRef.current = null;
          }
        },
        () => {
          if (passwordUpdateInFlightRef.current === operation) {
            passwordUpdateInFlightRef.current = null;
          }
        },
      );

      return operation;
    },
    [],
  );

  const finishPasswordRecovery = useCallback((): Promise<AccountActionResult> => {
    if (passwordRecoveryFinishInFlightRef.current) {
      return passwordRecoveryFinishInFlightRef.current;
    }

    const operation = (async () => {
      setError(null);
      setSigningOut(true);

      const result = await finishPasswordRecoveryService({
        auth: passwordRecoveryAuthClient,
      });

      if (!result.ok) {
        setError(result.error);
        setRecoveryStatus('error');
      } else {
        recoverySessionActiveRef.current = false;
        applyAccountUser(null);
        setRecoveryStatus('completed');
      }

      setSigningOut(false);
      return result;
    })();

    passwordRecoveryFinishInFlightRef.current = operation;
    void operation.then(
      () => {
        if (passwordRecoveryFinishInFlightRef.current === operation) {
          passwordRecoveryFinishInFlightRef.current = null;
        }
      },
      () => {
        if (passwordRecoveryFinishInFlightRef.current === operation) {
          passwordRecoveryFinishInFlightRef.current = null;
        }
      },
    );

    return operation;
  }, [applyAccountUser]);

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

  const deleteAccount = useCallback((): Promise<AccountActionResult> => {
    if (accountDeletionInFlightRef.current) {
      return accountDeletionInFlightRef.current;
    }

    if (user === null) {
      const error = accountDeletionError({
        code: 'ACCOUNT_DELETION_UNAUTHENTICATED',
      });
      setError(error);
      setDeletionStatus('error');
      return Promise.resolve({
        ok: false,
        error,
      } as const);
    }

    const operation = (async (): Promise<AccountActionResult> => {
      setError(null);
      setDeletionStatus('deleting');
      setSigningOut(true);

      const result = await deleteAccountService({
        client: accountDeletionClient,
      });

      if (!result.ok) {
        setError(result.error);
        setDeletionStatus('error');
        setSigningOut(false);
        return result;
      }

      try {
        await supabase.auth.signOut();
      } catch (signOutError) {
        if (__DEV__) {
          console.warn('[Account] deleted account session cleanup failed', signOutError);
        }
      }

      applyAccountUser(null);
      setError(null);
      setDeletionStatus('completed');
      setSigningOut(false);
      return result;
    })();

    accountDeletionInFlightRef.current = operation;
    void operation.finally(() => {
      if (accountDeletionInFlightRef.current === operation) {
        accountDeletionInFlightRef.current = null;
      }
    });

    return operation;
  }, [applyAccountUser, user]);

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
      deletionStatus,
      recoveryStatus,
      refresh,
      loginWithEmailPassword,
      continueWithGoogle,
      completeWithGoogleCallback,
      requestPasswordReset,
      completePasswordRecovery,
      updateRecoveredPassword,
      finishPasswordRecovery,
      registerWithEmailPassword,
      logout,
      deleteAccount,
      upgrade,
    }),
    [
      accountSnapshot,
      deleteAccount,
      error,
      deletionStatus,
      finishPasswordRecovery,
      loading,
      continueWithGoogle,
      completeWithGoogleCallback,
      completePasswordRecovery,
      loginWithEmailPassword,
      logout,
      recoveryStatus,
      requestPasswordReset,
      registerWithEmailPassword,
      refresh,
      status,
      updateRecoveredPassword,
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
