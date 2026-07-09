export enum SubscriptionStatus {
  FREE = 'FREE',
  PREMIUM = 'PREMIUM',
  LIFETIME = 'LIFETIME',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Auth lifecycle states produced by the Supabase Auth adapter in
 * useAccount. 'signingIn' covers an in-flight email/password login or
 * registration request.
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
  | 'LOGIN_FAILED'
  | 'REGISTER_FAILED'
  | 'INVALID_EMAIL'
  | 'WEAK_PASSWORD'
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
