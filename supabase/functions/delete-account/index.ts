import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const headers = { 'Content-Type': 'application/json' };

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { headers, status });
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return json({ ok: false, code: 'METHOD_NOT_ALLOWED' }, 405);
  }

  const authorization = request.headers.get('Authorization');
  const token = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length).trim()
    : '';

  if (!token) {
    return json(
      { ok: false, code: 'ACCOUNT_DELETION_UNAUTHENTICATED' },
      401,
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ ok: false, code: 'SERVICE_UNAVAILABLE' }, 503);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser(token);

  if (userError || !user) {
    return json(
      { ok: false, code: 'ACCOUNT_DELETION_SESSION_EXPIRED' },
      401,
    );
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(
    user.id,
  );

  if (deleteError) {
    return json({ ok: false, code: 'ACCOUNT_DELETION_FAILED' }, 500);
  }

  return json({ ok: true });
});
