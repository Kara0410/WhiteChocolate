import assert from 'node:assert/strict';
import test from 'node:test';

import { parsePasswordRecoveryCallback } from '../src/services/account-password-recovery-core';

const expectedRedirect = 'whitechoclate://auth/reset-password';

test('parses a valid PKCE recovery callback', () => {
  assert.deepEqual(
    parsePasswordRecoveryCallback(
      `${expectedRedirect}?code=one-time-code`,
      expectedRedirect,
    ),
    { ok: true, kind: 'code', code: 'one-time-code' },
  );
});

test('parses token callbacks from the URL fragment', () => {
  assert.deepEqual(
    parsePasswordRecoveryCallback(
      `${expectedRedirect}#access_token=access&refresh_token=refresh&type=recovery`,
      expectedRedirect,
    ),
    {
      ok: true,
      kind: 'tokens',
      accessToken: 'access',
      refreshToken: 'refresh',
    },
  );
});

test('rejects missing, malformed, and non-recovery callbacks', () => {
  for (const callback of [
    expectedRedirect,
    'not-a-url',
    `${expectedRedirect}?access_token=only-one-token`,
    `${expectedRedirect}?type=signup&code=wrong-purpose`,
  ]) {
    const result = parsePasswordRecoveryCallback(callback, expectedRedirect);
    assert.equal(result.ok, false);
  }
});

test('maps expired callback errors without exposing provider details', () => {
  const result = parsePasswordRecoveryCallback(
    `${expectedRedirect}?error_code=otp_expired&error_description=private%20provider%20detail`,
    expectedRedirect,
  );

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'PASSWORD_RECOVERY_LINK_EXPIRED');
    assert.equal(result.error.message.includes('private'), false);
  }
});

test('does not accept a callback from another route', () => {
  const result = parsePasswordRecoveryCallback(
    'whitechoclate://auth/callback#access_token=access&refresh_token=refresh&type=recovery',
    expectedRedirect,
  );

  assert.equal(result.ok, false);
});
