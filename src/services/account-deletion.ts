import type { AccountActionResult } from '@/types/account';
import { accountDeletionError } from '@/utils/account-errors';

type DeleteAccountResponse = {
  ok?: boolean;
  code?: string;
};

export type AccountDeletionClient = {
  functions: {
    invoke: (
      functionName: string,
    ) => Promise<{
      data: DeleteAccountResponse | null;
      error: unknown;
    }>;
  };
};

export async function deleteAccountService({
  client,
}: {
  client: AccountDeletionClient;
}): Promise<AccountActionResult> {
  try {
    const { data, error } = await client.functions.invoke('delete-account');

    if (error || data?.ok !== true) {
      return {
        ok: false,
        error: accountDeletionError(error ?? data ?? undefined),
      };
    }

    return { ok: true };
  } catch (error) {
    return { ok: false, error: accountDeletionError(error) };
  }
}
