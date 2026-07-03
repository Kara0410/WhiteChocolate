import type { User } from '@supabase/supabase-js';

import type { AccountUser } from '@/types/account';

function metadataString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function mapSupabaseUser(user: User | null): AccountUser | null {
  if (!user) {
    return null;
  }

  const email = user.email ?? '';
  const emailLocalPart = email.includes('@')
    ? email.slice(0, email.indexOf('@'))
    : email;

  const displayName =
    metadataString(user.user_metadata?.display_name) ??
    metadataString(user.user_metadata?.full_name) ??
    (emailLocalPart || 'Munich driver');

  return {
    id: user.id,
    displayName,
    email,
    avatarUrl: metadataString(user.user_metadata?.avatar_url),
  };
}
