import {
  invalidEmailError,
  weakPasswordError,
} from '@/utils/account-errors';

export const MIN_ACCOUNT_PASSWORD_LENGTH = 8;

export function normalizeAccountEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isValidAccountEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validateAccountEmail(email: string) {
  const normalizedEmail = normalizeAccountEmail(email);

  return isValidAccountEmail(normalizedEmail)
    ? { ok: true as const, email: normalizedEmail }
    : { ok: false as const, error: invalidEmailError() };
}

export function validateAccountPassword(password: string) {
  return password.length >= MIN_ACCOUNT_PASSWORD_LENGTH
    ? { ok: true as const }
    : { ok: false as const, error: weakPasswordError() };
}
