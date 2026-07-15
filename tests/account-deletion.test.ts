import assert from 'node:assert/strict';
import test from 'node:test';

import { deleteAccountService } from '../src/services/account-deletion';
import { accountDeletionError } from '../src/utils/account-errors';

test('account deletion accepts only an explicit server success response', async () => {
  const result = await deleteAccountService({
    client: {
      functions: {
        invoke: async () => ({ data: { ok: true }, error: null }),
      },
    },
  });

  assert.deepEqual(result, { ok: true });
});

test('account deletion normalizes backend failures without leaking details', async () => {
  const result = await deleteAccountService({
    client: {
      functions: {
        invoke: async () => ({
          data: { ok: false, code: 'ACCOUNT_DELETION_FAILED' },
          error: new Error('service role deleteUser stack trace'),
        }),
      },
    },
  });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(
      result.error.message,
      'Your account could not be deleted. No changes were made. Please try again.',
    );
    assert.equal(result.error.message.includes('service role'), false);
  }
});

test('anonymous account deletion is rejected safely', () => {
  const error = accountDeletionError({ code: 'ACCOUNT_DELETION_UNAUTHENTICATED' });

  assert.equal(error.code, 'ACCOUNT_DELETION_UNAUTHENTICATED');
  assert.equal(error.message, 'You must be signed in to delete an account.');
});
