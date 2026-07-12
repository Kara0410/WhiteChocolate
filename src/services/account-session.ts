import type { Session } from '@supabase/supabase-js';

import type { AccountError, AccountUser } from '@/types/account';
import { accountLoadError, logAccountAuthFailure } from '@/utils/account-errors';
import { mapSupabaseUser } from '@/utils/auth-user';

export type AccountSessionAuthClient = {
  getSession: () => Promise<{
    data: { session: Session | null };
    error: unknown;
  }>;
  onAuthStateChange: (
    callback: (event: string, session: Session | null) => void,
  ) => { data: { subscription: { unsubscribe: () => void } } };
};

export async function hydrateAccountSession({
  auth,
  setError,
  setLoading,
  setUser,
}: {
  auth: Pick<AccountSessionAuthClient, 'getSession'>;
  setError: (error: AccountError | null) => void;
  setLoading: (loading: boolean) => void;
  setUser: (user: AccountUser | null) => void;
}) {
  setLoading(true);
  setError(null);

  try {
    const { data, error } = await auth.getSession();

    if (error) {
      throw error;
    }

    setUser(mapSupabaseUser(data.session?.user ?? null));
  } catch (loadError) {
    logAccountAuthFailure('session', loadError);
    setError(accountLoadError(loadError));
  } finally {
    setLoading(false);
  }
}

export function subscribeToAccountAuthChanges({
  auth,
  onSession,
}: {
  auth: Pick<AccountSessionAuthClient, 'onAuthStateChange'>;
  onSession: (session: Session | null) => void;
}) {
  const { data } = auth.onAuthStateChange((_event, session) => {
    onSession(session);
  });

  return () => {
    data.subscription.unsubscribe();
  };
}
