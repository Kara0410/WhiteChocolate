import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  SubscriptionStatus,
  type AccountActionResult,
  type AccountError,
  type AccountUser,
} from '@/types/account';
import {
  accountLoadError,
  createAccountError,
} from '@/utils/account-errors';

const CURRENT_USER: AccountUser | null = null;

export function useAccount() {
  const [user] = useState<AccountUser | null>(CURRENT_USER);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AccountError | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Week 1 uses an anonymous local adapter. A future auth provider can
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

  const isSignedIn = user !== null;
  const isAnonymous = !isSignedIn;
  const subscriptionStatus = SubscriptionStatus.FREE;
  const displayName = user?.displayName ?? 'Munich driver';
  const email = user?.email ?? null;
  const avatar = user?.avatarUrl ?? null;

  return useMemo(
    () => ({
      user,
      isAnonymous,
      isSignedIn,
      subscriptionStatus,
      displayName,
      email,
      avatar,
      loading,
      error,
      refresh,
      logout,
      deleteAccount,
      upgrade,
    }),
    [
      avatar,
      deleteAccount,
      displayName,
      email,
      error,
      isAnonymous,
      isSignedIn,
      loading,
      logout,
      refresh,
      subscriptionStatus,
      upgrade,
      user,
    ],
  );
}
