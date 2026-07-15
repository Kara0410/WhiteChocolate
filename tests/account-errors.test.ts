import assert from 'node:assert/strict';
import test from 'node:test';

import {
  logAccountAuthFailure,
  normalizeAuthFailure,
} from '../src/utils/account-errors';

function authError(code: string, message = code, status = 400) {
  return {
    name: 'AuthApiError',
    code,
    message,
    status,
  };
}

test('maps exact Supabase signup codes to safe messages', () => {
  const cases = [
    ['email_exists', 'ACCOUNT_EXISTS'],
    ['user_already_exists', 'ACCOUNT_EXISTS'],
    ['weak_password', 'WEAK_PASSWORD'],
    ['signup_disabled', 'SIGNUP_DISABLED'],
    ['email_provider_disabled', 'EMAIL_PROVIDER_DISABLED'],
    ['email_address_not_authorized', 'EMAIL_NOT_AUTHORIZED'],
    ['over_email_send_rate_limit', 'RATE_LIMITED'],
    ['over_request_rate_limit', 'RATE_LIMITED'],
    ['request_timeout', 'REQUEST_TIMEOUT'],
    ['unexpected_failure', 'DATABASE_FAILURE'],
  ] as const;

  for (const [sourceCode, accountCode] of cases) {
    const normalized = normalizeAuthFailure(
      authError(sourceCode, `backend detail for ${sourceCode}`, 500),
      'signup',
    );

    assert.equal(normalized.code, accountCode);
    assert.equal(normalized.sourceCode, sourceCode);
    assert.equal(
      normalized.message.includes('backend detail'),
      false,
      sourceCode,
    );
  }
});

test('unknown Auth API errors use a safe signup fallback', () => {
  const normalized = normalizeAuthFailure(
    authError('surprising_backend_code', 'raw database stack trace', 500),
    'signup',
  );

  assert.equal(normalized.code, 'UNKNOWN_AUTH_ERROR');
  assert.equal(
    normalized.message,
    'Account creation is temporarily unavailable. Please try again later.',
  );
  assert.equal(normalized.developerMessage, 'raw database stack trace');
});

test('non-Auth network exceptions are normalized', () => {
  const normalized = normalizeAuthFailure(
    new TypeError('fetch failed'),
    'signup',
  );

  assert.equal(normalized.code, 'NETWORK_ERROR');
  assert.equal(normalized.category, 'network');
  assert.equal(normalized.retryable, true);
});

test('maps password recovery token failures to a neutral expired-link message', () => {
  const normalized = normalizeAuthFailure(
    authError('invalid_refresh_token', 'Refresh Token Not Found', 400),
    'password-recovery',
  );

  assert.equal(normalized.code, 'PASSWORD_RECOVERY_LINK_EXPIRED');
  assert.equal(
    normalized.message,
    'This password reset link is invalid or has expired. Request a new one.',
  );
});

test('developer diagnostics omit credentials and token-like fields', () => {
  const originalDev = (globalThis as { __DEV__?: boolean }).__DEV__;
  const originalWarn = console.warn;
  const calls: unknown[][] = [];

  (globalThis as { __DEV__?: boolean }).__DEV__ = true;
  console.warn = (...args: unknown[]) => {
    calls.push(args);
  };

  try {
    logAccountAuthFailure('signup', {
      name: 'AuthApiError',
      code: 'unexpected_failure',
      status: 500,
      message: 'trigger failed',
      password: 'secret-password',
      access_token: 'secret-access-token',
      apikey: 'secret-api-key',
    });
  } finally {
    console.warn = originalWarn;
    (globalThis as { __DEV__?: boolean }).__DEV__ = originalDev;
  }

  assert.equal(calls.length, 1);
  const serialized = JSON.stringify(calls[0]);
  assert.equal(serialized.includes('secret-password'), false);
  assert.equal(serialized.includes('secret-access-token'), false);
  assert.equal(serialized.includes('secret-api-key'), false);
  assert.equal(serialized.includes('trigger failed'), true);
});
