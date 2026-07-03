export enum SubscriptionStatus {
  FREE = 'FREE',
  PREMIUM = 'PREMIUM',
  LIFETIME = 'LIFETIME',
  UNKNOWN = 'UNKNOWN',
}

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
