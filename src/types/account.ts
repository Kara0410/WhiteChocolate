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
  | 'ACCOUNT_EXISTS'
  | 'SIGNUP_DISABLED'
  | 'EMAIL_PROVIDER_DISABLED'
  | 'EMAIL_NOT_AUTHORIZED'
  | 'RATE_LIMITED'
  | 'DATABASE_FAILURE'
  | 'NETWORK_ERROR'
  | 'REQUEST_TIMEOUT'
  | 'UNKNOWN_AUTH_ERROR'
  | 'GOOGLE_AUTH_CANCELLED'
  | 'GOOGLE_AUTH_UNAVAILABLE'
  | 'GOOGLE_AUTH_FAILED'
  | 'GOOGLE_AUTH_URL_MISSING'
  | 'GOOGLE_AUTH_CALLBACK_INVALID'
  | 'GOOGLE_AUTH_CREDENTIALS_MISSING'
  | 'GOOGLE_AUTH_SESSION_FAILED'
  | 'PASSWORD_RESET_REQUEST_FAILED'
  | 'PASSWORD_RECOVERY_LINK_INVALID'
  | 'PASSWORD_RECOVERY_LINK_EXPIRED'
  | 'PASSWORD_RECOVERY_SESSION_FAILED'
  | 'PASSWORD_UPDATE_FAILED'
  | 'PASSWORDS_DO_NOT_MATCH'
  | 'PASSWORD_TOO_SHORT'
  | 'LOGOUT_FAILED'
  | 'DELETE_NOT_IMPLEMENTED'
  | 'UPGRADE_NOT_IMPLEMENTED';

export type AccountErrorCategory =
  | 'validation'
  | 'auth'
  | 'configuration'
  | 'database'
  | 'network'
  | 'rateLimit'
  | 'unknown';

export type AccountError = {
  code: AccountErrorCode;
  message: string;
  category?: AccountErrorCategory;
  developerMessage?: string;
  retryable?: boolean;
  sourceCode?: string | null;
  status?: number | null;
  cause?: unknown;
};

export type AccountActionResult =
  | { ok: true }
  | { ok: false; error: AccountError };

export type PasswordRecoveryStatus =
  | 'idle'
  | 'requestingReset'
  | 'processingRecovery'
  | 'updatingPassword'
  | 'completed'
  | 'error';

export type RegisterActionResult =
  | { ok: true; status: 'authenticated'; user: AccountUser }
  | { ok: true; status: 'confirmation-required'; email: string }
  | { ok: false; error: AccountError };
