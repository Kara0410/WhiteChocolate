import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  type AccountActionResult,
  type AccountError,
  type AccountUser,
  type AuthStatus,
} from '@/types/account';
import {
  accountLoadError,
  createAccountError,
} from '@/utils/account-errors';
import { getCurrentAccountSnapshot } from '@/utils/account-state';

const CURRENT_USER: AccountUser | null = null;

export function useAccount() {
  const [user] = useState<AccountUser | null>(CURRENT_USER);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AccountError | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // The current app uses an anonymous local adapter. A future auth provider can
      // replace this boundary without changing the Account UI.
      await Promise.resolve();
    } catch (loadError) {
      setError(accountLoadError(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const logout = useCallback(async (): Promise<AccountActionResult> => {
    setError(null);

    if (user === null) {
      return { ok: true };
    }

    const logoutError = createAccountError(
      'LOGOUT_FAILED',
      'Sign out is not connected yet.',
    );
    setError(logoutError);
    return { ok: false, error: logoutError };
  }, [user]);

  const deleteAccount =
    useCallback(async (): Promise<AccountActionResult> => {
      const deleteError = createAccountError(
        'DELETE_NOT_IMPLEMENTED',
        'Account deletion will be connected when account creation is added.',
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

  // Truthful auth lifecycle state: with the anonymous local adapter, only
  // 'anonymous' and 'error' can occur. 'signingIn' / 'authenticated' /
  // 'signingOut' are produced by the future Supabase Auth adapter.
  const status: AuthStatus = error
    ? 'error'
    : user
      ? 'authenticated'
      : 'anonymous';

  return useMemo(
    () => ({
      ...accountSnapshot,
      status,
      loading,
      error,
      refresh,
      logout,
      deleteAccount,
      upgrade,
    }),
    [
      accountSnapshot,
      deleteAccount,
      error,
      loading,
      logout,
      refresh,
      status,
      upgrade,
    ],
  );
}
