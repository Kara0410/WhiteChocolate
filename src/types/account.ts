export enum SubscriptionStatus {
  FREE = 'FREE',
  PREMIUM = 'PREMIUM',
  LIFETIME = 'LIFETIME',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Auth lifecycle states for the future Supabase Auth adapter. Today only
 * 'anonymous' and 'error' occur; the rest are reserved so UI can be written
 * against the final contract. See docs/auth-foundation.md.
 */
export type AuthStatus =
  | 'anonymous'
  | 'signingIn'
  | 'authenticated'
  | 'signingOut'
  | 'error';

export type AccountUser = {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
};

export type AccountErrorCode =
  | 'LOAD_FAILED'
  | 'LOGOUT_FAILED'
  | 'DELETE_NOT_IMPLEMENTED'
  | 'UPGRADE_NOT_IMPLEMENTED';

export type AccountError = {
  code: AccountErrorCode;
  message: string;
  cause?: unknown;
};

export type AccountActionResult =
  | { ok: true }
  | { ok: false; error: AccountError };
